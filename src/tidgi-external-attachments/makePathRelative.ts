/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

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
export function makePathRelative(
  sourcepath: string,
  rootpath: string,
  options: {
    isWindows?: boolean;
    useAbsoluteForDescendents?: boolean;
    useAbsoluteForNonDescendents?: boolean;
  } = {},
) {
  // First we convert the source path from OS-dependent format to generic file:// format
  if (options.isWindows || $tw.platform.isWindows) {
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
  while (
    pathPartsCounter < sourceParts.length &&
    pathPartsCounter < rootParts.length &&
    sourceParts[pathPartsCounter] === rootParts[pathPartsCounter]
  ) {
    pathPartsCounter += 1;
  }
  // Use an absolute path if there's no common portion, or if specifically requested
  if (
    pathPartsCounter === 1 ||
    (options.useAbsoluteForNonDescendents &&
      pathPartsCounter < rootParts.length) ||
    (options.useAbsoluteForDescendents && pathPartsCounter === rootParts.length)
  ) {
    // If the path is not relative, don't add `file://` to it here, since TidGi / TiddlyWeb supports relative path like `./files/xxxx.png` or simply `files/xxxx.png` out of box. And only TidGi supports `file://` protocol.
    // But if is absolute path, we need to add `file://` to it, because Tiddlywiki don't handle `/` path for global file access.
    return `file://${sourcepath}`;
  }
  let pathPartOutputCounter = 0;
  // Move up a directory for each directory left in the root
  for (
    pathPartOutputCounter = pathPartsCounter;
    pathPartOutputCounter < rootParts.length - 1;
    pathPartOutputCounter++
  ) {
    outputParts.push('..');
  }
  // Add on the remaining parts of the source path
  for (
    pathPartOutputCounter = pathPartsCounter;
    pathPartOutputCounter < sourceParts.length;
    pathPartOutputCounter++
  ) {
    outputParts.push(sourceParts[pathPartOutputCounter]);
  }
  return outputParts.join('/');
}

export function joinPaths(...paths: string[]): string {
  let joinedPath = paths.join('/');
  if ($tw.platform.isWindows) {
    joinedPath = joinedPath.replaceAll('/', '\\');
  }
  return joinedPath;
}

export function basePath(filePath: string): string {
  if ($tw.platform.isWindows) {
    return filePath.split('\\').pop() || '';
  } else {
    return filePath.split('/').pop() || '';
  }
}
