---
layout: post
title: "DeXtree"
description: "A Windows File Explorer with Flat Files View and Timeline"
tags: [file management, flattened view, timeline, visualisation]
modified: 2014-04-15
image:
  feature: /dextree/dextree-timeline.jpg
---

The hierarchical file system is a wonderful approach to organising files but it is also a great opportunity to 'lose' files in amongst all those directories. There are typically two ways to finding files provided by most file explorers. One is to search, whereby you have to give the filename (or some part of it) and the system will show matching files. The other is tediously to look in each folder until you see the file. The first option is quick - if you know the filename, but sometimes you can't remember it. The other is painful. 

The answer to both these problems is the 'flat view'; showing all the files in a selected folder (or whole drive) and all subfolders. Curiously this is not a feature readily found in most file managers (I remember XTree could do it). I decided to write such a file explorer and to throw in a few other features not found on any other file managers. The result was DexTree, implemented in Delphi (Object Pascal) using the lovely <a href="http://www.soft-gems.net/index.php/controls/virtual-treeview">Virtual Treeview</a> control by Mike Lischke. 

<figure>
	<img src="/images/dextree/dextree-list.jpg" alt=""></a>
	<figcaption><center>DeXtree application showing list view.</center></figcaption>
</figure>


#Features

* Flat File View - Shows all the files in a selected folder, plus all those in subfolders. Optionally shows contents of system and hidden folders too.
* List view sortable by all columns and with search as you type in each column. Instantly find all the biggest files or newest files on a disk, for example.
* Can copy a the list view as a table of file details to the clipboard for pasting into Excel, Word or a text editor. Very useful if you need to list the files in a directory, for example in instructions or manifests.
* File content hashing (using MD5 at present). Used to find duplicate files, either by sorting on the hash column or by using the 'Select Dupes' routine, which highlights all except the first instance of a file with a particular hash. Sorting by date, you can highlight the oldest or newest versions of files.
* Timeline view - as far as I know, the only file manager that offers this (although I remember a Microsoft Demo for WinFS called Life Journal that did something like it). Essentially, this show all the files presented on a variable granularity timeline, allowing exploration of files temporally - sometimes you know a file by *when* you've written it.

You can download it <a href="/dextree/DeXTree.zip">here</a>. It is a little rough around the edges, so any bugs or suggestions are welcome.