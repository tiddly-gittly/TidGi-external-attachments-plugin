/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
const ENABLE_EXTERNAL_ATTACHMENTS_TITLE = '$:/config/ExternalAttachments/Enable';
const DISSABLE_FOR_IMAGE_TITLE = '$:/config/ExternalAttachments/DisableForImage';
const USE_ABSOLUTE_FOR_DESCENDENTS_TITLE = '$:/config/ExternalAttachments/UseAbsoluteForDescendents';
const USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE = '$:/config/ExternalAttachments/UseAbsoluteForNonDescendents';

declare var exports: {
  after: string[];
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};

// Export name and synchronous status
exports.name = 'tidgi-external-attachments';
exports.platforms = ['browser'];
exports.after = ['startup'];
exports.synchronous = true;

exports.startup = function() {
  const isTidGi = typeof window !== 'undefined' && typeof window.meta === 'function';
  if (!isTidGi) return;
  const workspaceID = window?.meta?.()?.workspaceID;
  if (!workspaceID) return;
  void window?.service?.workspace?.get(workspaceID).then(workspace => {
    const wikiFolderLocation = workspace?.wikiFolderLocation;
    if (!wikiFolderLocation) return;
    $tw.hooks.addHook('th-importing-file', function(info) {
      const isImage = info.type.startsWith('image');
      const skipForImage = isImage && $tw.wiki.getTiddlerText(DISSABLE_FOR_IMAGE_TITLE, '') === 'yes';
      if (skipForImage) return;
      if (info.isBinary && info.file.path && $tw.wiki.getTiddlerText(ENABLE_EXTERNAL_ATTACHMENTS_TITLE, '') === 'yes') {
        let fileCanonicalPath = makePathRelative(info.file.path, wikiFolderLocation, {
          useAbsoluteForNonDescendents: $tw.wiki.getTiddlerText(USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE, '') === 'yes',
          useAbsoluteForDescendents: $tw.wiki.getTiddlerText(USE_ABSOLUTE_FOR_DESCENDENTS_TITLE, '') === 'yes',
        });
        fileCanonicalPath = `file://${fileCanonicalPath}`;
        info.callback([
          {
            title: info.file.name,
            type: info.type,
            _canonical_uri: fileCanonicalPath,
          },
        ]);
        return true;
      } else {
        return false;
      }
    });
  });
};

/**
Given a source absolute filepath and a root absolute path, returns the source filepath expressed as a relative filepath from the root path.

sourcepath comes from the "path" property of the file object, with the following patterns:
	/path/to/file.png for Unix systems
	C:\path\to\file.png for local files on Windows
	\\sharename\path\to\file.png for network shares on Windows
rootpath comes from document.location.pathname or wikiFolderLocation with urlencode applied with the following patterns:
	/path/to/file.html for Unix systems
	/C:/path/to/file.html for local files on Windows
	/sharename/path/to/file.html for network shares on Windows
*/
function makePathRelative(
  sourcepath: string,
  rootpath: string,
  options: { useAbsoluteForDescendents?: boolean; useAbsoluteForNonDescendents?: boolean } = {},
) {
  // First we convert the source path from OS-dependent format to generic file:// format
  if ($tw.platform.isWindows) {
    sourcepath = sourcepath.replaceAll('\\', '/');
    // If it's a local file like C:/path/to/file.ext then add a leading slash
    if (sourcepath.charAt(0) !== '/') {
      sourcepath = '/' + sourcepath;
    }
    // If it's a network share then remove one of the leading slashes
    if (sourcepath.substring(0, 2) === '//') {
      sourcepath = sourcepath.substring(1);
    }
  }
  // Split the path into parts
  const sourceParts = sourcepath.split('/');
  const rootParts = rootpath.split('/');
  const outputParts = [];
  // fix /private/var/xxx on macOS in sourceParts, which is same as /var/xxx in rootParts
  if ($tw.platform.isMac && sourceParts[1] === 'private') {
    sourceParts.splice(1, 1);
  }
  // urlencode the parts of the sourcepath
  $tw.utils.each(sourceParts, function(part, index) {
    sourceParts[index] = encodeURI(part);
  });
  // Identify any common portion from the start
  let pathPartsCounter = 0;
  while (pathPartsCounter < sourceParts.length && pathPartsCounter < rootParts.length && sourceParts[pathPartsCounter] === rootParts[pathPartsCounter]) {
    pathPartsCounter += 1;
  }
  // Use an absolute path if there's no common portion, or if specifically requested
  if (
    pathPartsCounter === 1 || (options.useAbsoluteForNonDescendents && pathPartsCounter < rootParts.length) ||
    (options.useAbsoluteForDescendents && pathPartsCounter === rootParts.length)
  ) {
    return sourcepath;
  }
  let pathPartOutputCounter = 0;
  // Move up a directory for each directory left in the root
  for (pathPartOutputCounter = pathPartsCounter; pathPartOutputCounter < rootParts.length - 1; pathPartOutputCounter++) {
    outputParts.push('..');
  }
  // Add on the remaining parts of the source path
  for (pathPartOutputCounter = pathPartsCounter; pathPartOutputCounter < sourceParts.length; pathPartOutputCounter++) {
    outputParts.push(sourceParts[pathPartOutputCounter]);
  }
  return outputParts.join('/');
}
