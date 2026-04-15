---
title: Adding Questions
sidebar_position: 1
slug: /adding-questions
---

import ReactPlayer from "react-player";

## Add questions to the project {#1850d745ac9e80e09444cb3564752e31}

In order to get feedback on your translation, you'll need to add comprehension checking questions. You can import questions created by someone else, or create your own.

:::note

Currently the only way to get feedback from community checkers is to ask checking questions. Some project administrators have asked for checkers to be able to add comments to the text even without a question present. If that's something your project may benefit from, please [voice your support for the proposal](https://community.scripture.software.sil.org/t/feature-request-comments-to-any-bible-verse-chosen/2506/6) on the [Scripture Forge community site](https://community.scripture.software.sil.org/).

:::

<div class="player-wrapper"><ReactPlayer controls url="https://youtu.be/J-led5En3D8" /></div>

### Creating questions individually in Scripture Forge {#1850d745ac9e8031908ef693ff578eec}

To add questions to your project, click on **Manage questions** under the **Community Checking** section in the navigation sidebar. Then click on the **Add Question** button. A dialog will open that will allow you to create a question.

A question can apply to a single verse, or multiple verses. Type a reference into the **Scripture reference** box, or click the dropdown arrow to select a book, chapter, and verse. If you want the question to span multiple verses, enter an end reference in the second box. Once you've input a reference, the text will show up, with the verses you chose highlighted.

Type your question into the **Question** box. If you want to add an audio version of the question, click the **Record** button. You may be prompted to give permission to access your microphone. When you have finished recording, click **Stop Recording**. You can then play the recording to hear how it sounds. Click the **Try Again** button if you're not satisfied with it. You can also upload an audio file instead of recording, if you prefer.

Click **Save** and your question will be added to the list of community checking questions.

![](./1916935940.png)

### Importing questions from a spreadsheet {#1850d745ac9e8085960dd88b648f0c7a}

Creating questions one by one can be tedious, so we've also made it possible to import questions from a spreadsheet. You can use a program such as Microsoft Excel, Google Sheets, or LibreOffice Calc to create or edit a list of questions. If you're looking for a set of pre-made questions, consider the [unfoldingWord® Translation Questions](https://git.door43.org/unfoldingWord/en_tq). If you go to the linked page and click on one of the files, you can then download it, open it as a spreadsheet, and edit the list of questions.

Here's an example of how the rows in your spreadsheet should look in order to be able to import it to Scripture Forge:

| Reference | Question                                                |
| --------- | ------------------------------------------------------- |
| HEB 1:1   | What does "our fathers" refer to?                       |
| HEB 1:2   | What does it mean that the Son is "heir of all things"? |
| HEB 1:2-3 | Who is the "Son" spoken of in these verses?             |

The spreadsheet can have more columns as well, but all columns except the "reference" and "question" columns will not be used. The TSV files published by unfoldingWord are in a slightly different format, but can be imported to Scripture Forge too.

:::note

The reference needs to have the book name abbreviated the same way Paratext abbreviates book names. For example, **HEB 1:1** will work, but **Hebrews 1:1** will not work.

:::

If you need help getting your spreadsheet into the right format to import to Scripture Forge, we would be happy to help you. Just send an email to [help@scriptureforge.org](mailto:help@scriptureforge.org).

1. Save your spreadsheet as a CSV file.

	:::note

	If you are using Microsoft Excel, be sure to select "CSV UTF-8 (Comma delimited) (*.csv)" as the file type when exporting as CSV.

	:::

2. Then in Scripture Forge, click on **Manage questions** under the **Community Checking** section in the navigation sidebar.
3. Then click on the **Bulk import** button. A dialog will open requesting for you to choose where you want to import questions from.
4. Click on **Import from CSV file** and select the file.
	1. If you have some rows in your file that don't have a valid reference and question, a warning will be shown letting you know that these rows will be skipped.
	2. Otherwise you will be shown a list of questions.

### Import all questions {#1850d745ac9e80b59ae8cabac1b67e7f}

To import all of the questions in the CSV file, follow these steps:

1. Click the checkbox at the top of the list. This will select all the questions.
2. Click **Import Selected Questions**.

### Import a subset of questions {#1850d745ac9e8045aa5bd2ab9ce99fbc}

You can also filter for a subset of the questions:

1. Use the **Reference from** and **Reference to** boxes to specify the verses that you want the questions to start and end at.
2. For example, if you only want to import questions for Mark 5:
	1. Put **MRK 5:1** in the **Reference from** box.
	2. Put **MRK 5:43** in the **Reference to** box.
3. Click the checkbox at the top of the list to select all questions. Only the questions that are shown will be selected.
4. Click **Import Selected Questions**.

:::note

You don't have to remember that there are 43 verses in Mark 5 in order to filter for all the verses in the chapter. If you click the dropdown arrow in the **Reference to** box, a dialog will open allowing you to select a book, chapter, and verse. Once you select Mark 5, it will list the verses in Mark 5, and you'll be able to select the last one, which is verse 43. Alternatively you can type **MRK 5:100** in the **Reference to** box, and all the verses in Mark 5 will be included, even though there isn't actually a verse 100 in Mark 5.

:::

### Importing questions from Transcelerator {#1850d745ac9e8003815fc894b8baaeb7}

[Transcelerator](https://software.sil.org/transcelerator/) is a plugin for Paratext that has a bank of ready-made comprehension checking questions in several major languages. Those questions can be translated within Paratext, exported to Scripture Forge, and then after a sync, imported into Scripture Forge.

To import questions from Transcelerator:

1. Download and install Transcelerator from [software.sil.org/transcelerator/download](https://software.sil.org/transcelerator/download/).
2. Restart Paratext.
3. From within Paratext, launch Transcelerator.
4. Within Transcelerator, open the **File** menu and click **Produce Scripture Forge Files**.
5. Type the translations of the English questions you want to use in the **Translation** column. For each question that's ready, select the **Confirmed** check box for the questions.
6. Close Transcelerator, and do a send and receive with Paratext.
7. In Scripture Forge, in the navigation sidebar, click **Synchronize**. On the page that opens, click **Synchronize** to send and receive the Transcelerator questions from Paratext.
8. Click on **Manage questions** under the **Community Checking** section in the navigation sidebar. Then click on the **Bulk import** button.
9. A dialog will open requesting for you to choose where you want to import questions from. Click **Import from Transcelerator**.
10. Select the questions you want to import. The steps for doing this are exactly the same as in the section above titled **Importing questions from a spreadsheet**. Refer to that section for instructions on filtering for the questions you want.
11. Click **Import Selected Questions** and your questions will be added to the project.

## Attach audio recording of the text {#1850d745ac9e80e795f3d611356e74d5}

Scripture Forge can play an audio recording of each passage for community checkers. To do this, you will need to upload an audio file and a timing file for each chapter. Timing files allow Scripture Forge to highlight each verse as it is being spoken.

### Recording the text {#1850d745ac9e805eb4b1c0f05d6da02a}

Scripture Forge supports audio in .mp3 and .wav file formats. Timing files are supported from HearThis, aeneas, Audacity, and Adobe Audition.

One of the simplest options is to use [HearThis](http://software.sil.org/hearthis) to record the translation. [This guide](https://software.sil.org/downloads/r/scriptureappbuilder/Scripture-App-Builder-08-Using-HearThis-for-Audio-Recording.pdf) will walk you through the process of recording scripture and producing audio and timing files. Skip the steps at the end about using Scripture App Builder.

The [resources](https://software.sil.org/scriptureappbuilder/resources/) for Scripture App Builder discuss more advanced approaches, such as using Glyssen for a dramatized audio recording.

### Creating timing files {#1850d745ac9e80c7b583c6d50193d7c9}

If you already have audio recorded, there are several options for creating timing data.

You can automatically generate timing files using aeneas by following [these instructions](https://software.sil.org/downloads/r/scriptureappbuilder/Scripture-App-Builder-07-Using-aeneas-for-Audio-Text-Synchronization.pdf).

Alternatively, you can manually create timing files using Audacity by following [this guide](https://software.sil.org/downloads/r/scriptureappbuilder/Scripture-App-Builder-06-Using-Audacity-for-Audio-Text-Synchronization.pdf). Another option is Adobe Audition. Timing data from Adobe Audition is supported in decimal or FPS time formats. We don't support the "samples" format.

### Attaching audio {#1850d745ac9e80668685c9ea58252d6b}

To upload audio and timing files, in the sidebar click **Questions & answers**, navigate to the chapter you want to attach audio to, and then click the **Manage Audio** icon in the top right corner. Click **Browse Files** and select the audio recording and associated timing file for that chapter, then click **Save**.

![](./645317227.png)

