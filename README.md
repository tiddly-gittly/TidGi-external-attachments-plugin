# TidGi External Attachments Plugin

> https://tiddlywiki.com/static/External%2520Attachments%2520Plugin.html
>
> The External Attachments Plugin provides support for importing tiddlers as external attachments. That means that instead of importing binary files as self-contained tiddlers, they are imported as "skinny" tiddlers that reference the original file via the \_canonical_uri field. This reduces the size of the wiki and thus improves performance. However, it does mean that the wiki is no longer fully self-contained.
>
> This plugin only works when using TiddlyWiki with platforms such as TiddlyDesktop that support the path attribute for imported/dragged files.

This plugin is a fork of https://github.com/Jermolene/TiddlyWiki5/tree/d4846bae6c7e0e529d62cf83d439528ad63aa003/plugins/tiddlywiki/external-attachments

## How to use

Just install it from [CPL](https://tw-cpl.netlify.app/#Plugin_202305190710119), and reload page.

Then drag&drop file into TidGi will create a skinny tiddler. Try edit that tiddler to find out how this "pointer file" works.

### File path

TidGi supports link and `_canonical_uri` to use `file://` prefix (or `open://`, both works the same), for example:

```wikitext
[ext[Some External File Link with CJK character|file:///Users/linonetwo/Downloads/(OCRed)奖励的惩罚 (（美）科恩著) (Z-Library).pdf]]

[ext[An External Folder Link|file:///Users/linonetwo/Downloads/]]
```

So when you drag a file into wiki, `_canonical_uri` created by this plugin will also prefixed by `file://`.
