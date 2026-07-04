# Tidings

> **[Read the Tidings Documentation](https://fable-retold.github.io/tidings/)** - interactive docs with the full API reference.

An extensible micro-service friendly reporting system.  Meant to be drop-in and super easy to use.
This was built after looking at what was available on the free and paid market to solve the following requirements:

1. I have some data in my application (say, a set of temperatures associated with timestamps)
2. I want to create a few reports for my users
    - a chart with average temperatures by hour
    - a calendar with average temperatures by day of week
    - a histogram of temperature distribution
3. These reports need to work on mobile and browser web (html)
4. They should be able to be made into PDFs
5. There should be thumbnails to show previews on my web app
6. I want to be able to add reports without changing any application code

It turns out that just doing these things with most off-the-shelf reporting tools is challenging to nigh impossible.  Further, they really don't mesh well with micro-service architecture.

We also wanted to optimize the ratio of *configuration* versus *code*.  Less code is less debt!

## Technology Summary
Each report is described by a "Report Description" object.  When you request a report, this object is created and embeds the data you pass as a child object called the "Datum".  Each run of the report creates a "Report Manifest".  This carries state and information about the run.  A few key properties from the child object are looked for, and affect how the report is run.  The most important property is "Type", and a close second is "Renderer".

## How do I Use This (aka _quick start guide_)
So you want to create a report.  Follow these simple steps to success (assuming you are in the folder of some node.js application code):

#### Step 1: Install the Tidings and Fable NPM Modules:
```
 npm install --save tidings fable
```

#### Step 2: Make a folder to store your report definitions:
```
mkdir myreports
```

#### Step 3: Initialize your Fable and Tidings modules in code:
This code goes into your node application.  Mine is a new file called `server.js`:

```
const libFable = require('fable').new(
{
	Tidings:
	{
		ReportDefinitionFolder: `${__dirname}/myreports/`,
		ReportOutputFolder: `${__dirname}/stage/`
	}
}
);

const libTidings = require('tidings').new(libFable);
```

#### Step 4: Create a default report:
This is where the bulk of what we need to do happens.  In order to create a report, we need at least three files.  Later we will drive into what they do in the generation process.

Each report has a *Type*, which defines what type of report it is.  The *Type* also matches what folder it goes in.  So to create an `default` *Type* report, we create a folder like so:
```
mkdir myreports/default
```

Later we will look at what *Type* and *Renderer* mean.  For now we can just say that tidings has a bunch of defaults, and the default *Report Type* is `default` and the default *Report Renderer* is `html`.

For a report to work it needs at least three files -- we can create those now.

First the *Report Definition*.  A `json` file which goes in `myreports/default/report_definition.json`.  We can create that by doing the following:
```
touch myreports/default/report_definition.json
```

Then putting the following content in:
```
{
	"Hash":"default",
	"Name": "My First Report",
	"Renderers": 
	{
		"html": {}
	}
}
```

The only thing we care about here is that we've told it the *Report Type* Hash is `html`.

Next we are going to create the *Report Script* file, where we can override behaviors in various phases of generating a report:
```
touch myreports/default/report.js
```

Then putting the following content in:
```
module.exports = {};
```

There aren't any customizations done to code yet, so we aren't going to worry about putting anything in there.

Lastly we need some template content for the engine to do something with.  Content is associated with the *Report Renderer*.  This means we need to create the folder:
```
mkdir myreports/default/html
```

Then create the basic file:
```
touch myreports/default/html/index.html
```

And finally put this content in:
```
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Default Report</title>
  </head>
  <body>
	  <h1>Song Report</h1>
	  <p>Artist: <%= Datum.Artist %></p>
	  <p>Song: <%= Datum.Song %></p>
	  <p>Year: <%= Datum.Year %></p>
  </body>
</html>
```

#### Step 5: Tell Tidings module to generate the default report:
This code goes in your node application, after you have initialized Fable and Tidings.  For me this is again in my `server.js` file:

```
var reportHash = libTidings.render(
  {
    Artist:'Queen', 
    Song:'We Will Rock You',
    Year: 1977
  },
  (error)=>
  {
    console.log(`Report rendered to: ${libFable.settings.Tidings.ReportOutputFolder}/${reportHash}`);
  }
);
```

#### Step 6: Finally we can run the report:
```
stevenvelozo:~/workspace $ node server.js
{"name":"Fable","hostname":"stevenvelozo-tidings-tutorial-3993273","pid":2204,"level":30,"Source":"0x560eb56006c00000","ver":"0.0.0","datum":{},"msg":"Creating folders at /home/ubuntu/workspace/stage/0x560eb56067000000","time":"2016-11-06T18:10:20.909Z","v":0}
{"name":"Fable","hostname":"stevenvelozo-tidings-tutorial-3993273","pid":2204,"level":30,"Source":"0x560eb56006c00000","ver":"0.0.0","datum":{},"msg":"...persisted the Report Datum","time":"2016-11-06T18:10:20.921Z","v":0}
{"name":"Fable","hostname":"stevenvelozo-tidings-tutorial-3993273","pid":2204,"level":30,"Source":"0x560eb56006c00000","ver":"0.0.0","datum":{},"msg":"...persisted the Report Manifest for 0x560eb56067000000 type default","time":"2016-11-06T18:10:20.924Z","v":0}
. . . . . . . TONS OF SPAM LATER . . . . . . . .
{"name":"Fable","hostname":"stevenvelozo-tidings-tutorial-3993273","pid":2204,"level":30,"Source":"0x560eb56006c00000","ver":"0.0.0","datum":{},"msg":"Rendering completed in 52ms","time":"2016-11-06T18:10:20.959Z","v":0}
{"name":"Fable","hostname":"stevenvelozo-tidings-tutorial-3993273","pid":2204,"level":30,"Source":"0x560eb56006c00000","ver":"0.0.0","datum":{},"msg":"...persisted the Report Manifest for 0x560eb56067000000 type default","time":"2016-11-06T18:10:20.960Z","v":0}
Report rendered to: /home/ubuntu/workspace/stage//0x560eb56067000000
stevenvelozo:~/workspace $
```

If all went to plan, you should have a folder with the report data fully staged in `/home/ubuntu/workspace/stage/0x560eb56067000000` (really some similar folder .. we logged it out to the console when rendering was done).  The staged folder includes a copy of the final manifest, and a "Stage" location where you can find the index.html.

The resulting folder tree should look something like this (including the run report):

```
|-- myreports
|  `-- default
|     |-- html
|     |  `-- index.html
|     |-- report.js
|     `-- report_definition.json
|-- node_modules
|  |-- fable
|  `-- tidings
|-- package.json
|-- server.js
`-- stage
   `-- 0x560eb56067000000
      |-- Assets
      |-- Datum.json
      |-- Manifest.json
      `-- Stage
         `-- index.html
```



# Terminology

## Datum
The datum is the core data for the report.  It is sent either in a `POST` request or via the call to Tidings.

## Report Definition
The definition for a report, including at minimum a JSON file, a JS file and at least one templated text file for each Renderer.

## Report Description
The content in a JSON file describing a report.  This tells tidings what assets to download, what templates to process and what rasterizers to run.

## Report Script
A javascript file that you can define functions in to inject functionality between phases of the Tidings report generation process.

## Report Run Manifest
A json file that is created and updated as a report is generating.  Reports can take a long time to complete, this file can be continually updated to reflect that.

## Type
The type of report being rendered.  Type is a business context, so this could be a "Equipment Received" report or a "Expense Tally" report.  The strings must be folder names for where the Report Definition is.

## Renderer
The render method for reports.  The default is `html`, and the engine looks for a folder named `html` in the Report Definition folder.  You could create a `pdf` version of the same report, or get very exotic and create a `xls` report.  These are not limited to formats, though -- you could easily generate a `html-summary`, `html` and `html-extended` to use the same data for two views of the same report.

# Rasterizers
Tidings comes bundled with a number of rasterizers.  After the report has gathered and calculated any intermediate data, assets can be generated.  This includes images, pdfs, videos, audio, whatever you like.  Each rasterizer plugin requires an OS installation of some kind, and an NPM installation to work.  This is to prevent the NPM dependencies for this reporting library from getting ridiculously large, while also not requiring six other modules to be loaded to work.

### PhantomPDF
PhantomJS is a headless WebKit scriptable with a JavaScript API. It has fast and native support for various web standards: DOM handling, CSS selector, JSON, Canvas, and SVG.

http://phantomjs.org/

```
npm install phantomjs-prebuilt phantom-html-to-pdf
```

### WKHTMLTOPDF
wkhtmltopdf and wkhtmltoimage are open source (LGPLv3) command line tools to render HTML into PDF and various image formats using the Qt WebKit rendering engine. These run entirely "headless" and do not require a display or display service.

http://wkhtmltopdf.org/

This library has a self-contained node module so you don't have to do anything in the OS.  To install just:

```
npm install wkhtmltopdf-selfcontained
```

However there is some trickiness, especially with Docker containers.  The library uses your *nix locale environment variable.  So if you are running from Cloud9, your environment needs to be changed from their custom C.UTF-8 to C.  This means you have to do this *in each terminal of cloud9 that you expect this renderer to work from*:

Check the available locale settings:
```
locale -a
```

Which will show in Cloud9:
```
  C
  C.UTF-8
  POSIX
```

Then set a locale with this (I would suggest putting it in your .bash_profile or such):

```
LC_ALL=C
```

### LaTeX

LaTeX is a high-quality typesetting system; it includes features designed for the production of technical and scientific documentation. LaTeX is the de facto standard for the communication and publication of scientific documents. LaTeX is available as free software.

https://www.latex-project.org/

Installation on Ubuntu:

```
sudo apt-get install texlive
```

Installation on OS/X:

```
https://tug.org/mactex/
```

Install the npm module (from the root of your application folder):

```
npm install latex-file
```

### GraphViz

Graphviz is open source graph visualization software. Graph visualization is a way of representing structural information as diagrams of abstract graphs and networks. It has important applications in networking, bioinformatics,  software engineering, database and web design, machine learning, and in visual interfaces for other technical domains. 

http://www.graphviz.org/

Installation on Ubuntu:

```
apt-get install graphviz
```

Install the npm module (from the root of your application folder):

```
npm install graphviz
```

### FFMPEG

A complete, cross-platform solution to record, convert and stream audio and video.

https://www.ffmpeg.org/

There is a prebuilt version of ffmpeg and ffprobe for NPM:

```
npm install @ffmpeg-installer/ffmpeg fluent-ffmpeg @ffprobe-installer/ffprobe
```

There appears to be a bug though, and you need to make the ffprobe binary executable:

```
chmod +x node_modules/@ffprobe-installer/ffprobe/node_modules/@ffprobe-installer/linux-x64/ffprobe   
```



## Renderer

## A very basic report Datum object looks like:

```
{
   "Name": "Joan of Arc"
}
```

## The same Datum requesting the `PDF` version of the `AccountsPaid` report (since the engine defaults to `html`):

```
{
   "Name": "Joan of Arc"
   "TidingsData": { "Type":"accountspaid", "Renderer":"pdf" }
}
```


## A Report Manifest object looks like:

```
{
    "Metadata": {
        "IDReportDescription": "0",
        "GUIDReportDescription": "0x560c0aa770c00000",
        "Type": "assetladen",
        "Title": "The Default Report",
        "Summary": "This is the summary for the default report.",
        "Renderer": "html",
        "DefaultFile": "index.html",
        "Version": 0,
        "Creator": "Unknown",
        "CreatingIDUser": 0,
        "CreateDate": false,
        "Updator": "",
        "UpdatingIDUser": 0,
        "UpdateDate": false,
        "LocationHash": "0x560c0aa770c00000",
        "RepresentedDateBegin": false,
        "RepresentedDateEnd": false,
        "Locations": {
            "Root": "/Retold/tidings/test/../stage/0x560c0aa770c00000/",
            "Asset": "/Retold/tidings/test/../stage/0x560c0aa770c00000/Assets/",
            "Stage": "/Retold/tidings/test/../stage/0x560c0aa770c00000/Stage/",
            "Scratch": "/Retold/tidings/test/../stage/0x560c0aa770c00000/Scratch/",
            "ReportDefinition": "/Retold/tidings/test/reports/assetladen/",
            "Common": "/Retold/tidings/test/reports/assetladen/common/"
        }
    },
    "Status": {
        "Rendered": true,
        "CompletionProgress": 100,
        "StartTime": 1478276849091,
        "EndTime": 1478276851003,
        "CompletionTime": 1912
    },
    "AssetCollectionList": [
        {
            "URL": "http://api.geonames.org/postalCodeLookupJSON?postalcode=98105&country=US&username=tidings",
            "File": "ZipCodes.json",
            "RequestStartTime": 1478276849099,
            "Path": "/Retold/tidings/test/../stage/0x560c0aa770c00000/Assets/",
            "Size": 205,
            "RequestEndTime": 1478276850533,
            "PersistCompletionTime": 1478276850535,
            "TotalDownloadTime": 1436
        },
        {
            "URL": "http://neverworkintheory.org/",
            "File": "NeverWorkInTheory.html",
            "RequestStartTime": 1478276850535,
            "Path": "/Retold/tidings/test/../stage/0x560c0aa770c00000/Assets/",
            "Size": 27238,
            "RequestEndTime": 1478276850941,
            "PersistCompletionTime": 1478276850942,
            "TotalDownloadTime": 407
        }
    ],
    "RasterizationList": [],
    "Errors": [],
    "Templates": [
        {
            "File": "index.html",
            "Path": "/Retold/tidings/test/reports/assetladen//html"
        }
    ],
    "Log": [
        "Fri, 30 Sep 2016 16:27:29 GMT: Creating folders at /Retold/tidings/test/../stage/0x560c0aa770c00000",
        "Fri, 30 Sep 2016 16:27:29 GMT: ...persisted the Report Datum",
        "Fri, 30 Sep 2016 16:27:29 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:29 GMT: Loaded definition: /Retold/tidings/test/reports/assetladen",
        "Fri, 30 Sep 2016 16:27:29 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:29 GMT: Loading the Report-Specific Behaviors",
        "Fri, 30 Sep 2016 16:27:29 GMT: Parsing the Report Definition for Renderer",
        "Fri, 30 Sep 2016 16:27:29 GMT: ...Adding template [object Object]",
        "Fri, 30 Sep 2016 16:27:29 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:29 GMT: Executing report pre-collect",
        "Fri, 30 Sep 2016 16:27:29 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:29 GMT: Collecting assets...",
        "Fri, 30 Sep 2016 16:27:30 GMT: --> Wrote asset: ZipCodes.json TO /Retold/tidings/test/../stage/0x560c0aa770c00000/Assets/",
        "Fri, 30 Sep 2016 16:27:30 GMT: --> Wrote asset: NeverWorkInTheory.html TO /Retold/tidings/test/../stage/0x560c0aa770c00000/Assets/",
        "Fri, 30 Sep 2016 16:27:30 GMT: ...Asset downloads complete.",
        "Fri, 30 Sep 2016 16:27:30 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:30 GMT: Executing calculate function...",
        "Fri, 30 Sep 2016 16:27:30 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:30 GMT: Processing templates...",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 0 => About",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 1 => Guidelines",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 2 => Archives",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 3 => Categories",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 4 => License",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 5 => Empirical Software Engineering Using R",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 6 => Test-Driven Development",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 7 => Revisiting the Anatomy and Physiology of the Grid",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 8 => FIDEX: Filtering Spreadsheet Data using Examples",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 9 => Apex: Automatic Programming Assignment Error Explanation",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 10 => Purposes, Concepts, Misfits, and a Redesign of Git",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 11 => Paradise Unplugged",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 12 => Five From ICER'16",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 13 => ACM Permits Authors to Post Open Access Copies of Their Own Work",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 14 => You Keep Using That Word...",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 15 => A Multi-Site Joint Replication of a Design Patterns Experiment Using Moderator Variables to Generalize Across Contexts",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 16 => The Role of Ethnographic Studies in Empirical Software Engineering",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 17 => Do Code Smells Hamper Novice Programming?",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 18 => Perspectives on Data Science for Software Engineering",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 19 => How Well Do Developers Understand Open Source Licenses?",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 20 => Suggestions",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 21 => An Interview with Andreas Stefik",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 22 => Polymorphism in Python",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 23 => Frequency Distribution of Error Message",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 24 => Parallelism in Open Source Projects",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 25 => ...more",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 26 => comments powered by Disqus.",
        "Fri, 30 Sep 2016 16:27:30 GMT: Rendering a link to the report, index 27 => Comments powered by Disqus",
        "Fri, 30 Sep 2016 16:27:30 GMT: --> Wrote stage data: index.html TO /Retold/tidings/test/../stage/0x560c0aa770c00000/Stage/",
        "Fri, 30 Sep 2016 16:27:30 GMT: ...Template processing complete.",
        "Fri, 30 Sep 2016 16:27:30 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:30 GMT: Running rasterizer...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...auto rasterization complete.",
        "Fri, 30 Sep 2016 16:27:31 GMT: This is really rasterizey...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:31 GMT: Executing post-render functions...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Default behavior.",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:31 GMT: Cleaning up temporary files...",
        "Fri, 30 Sep 2016 16:27:31 GMT: Deleted scratch file: Links.json",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa770c00000 type assetladen",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Report rendered.",
        "Fri, 30 Sep 2016 16:27:31 GMT: Rendering completed in 1912ms"
    ]
}
```

Notice that the report stores the datums as files alongside everything else.  This is so whatever toolchain is rendering the report can load the file however it wants without having to have interop with the reporting code.  As well we can store any run logging for easy debugging.  There is also a bunch of interesting information about the two files it downloaded (an HTML file and a JSON endpoint).

Interestingly, when a report has an issue executing a template the manifest will reflect the problem -- consider the following manifest:

```
{
    "Metadata": {
        "IDReportDescription": "0",
        "GUIDReportDescription": "0x560c0aa952000000",
        "Type": "badtemplate",
        "Title": "The Default Report",
        "Summary": "This is the summary for the default report.",
        "Renderer": "html",
        "DefaultFile": "index.html",
        "Version": 0,
        "Creator": "Unknown",
        "CreatingIDUser": 0,
        "CreateDate": false,
        "Updator": "",
        "UpdatingIDUser": 0,
        "UpdateDate": false,
        "LocationHash": "0x560c0aa952000000",
        "RepresentedDateBegin": false,
        "RepresentedDateEnd": false,
        "Locations": {
            "Root": "/Retold/tidings/test/../stage/0x560c0aa952000000/",
            "Asset": "/Retold/tidings/test/../stage/0x560c0aa952000000/Assets/",
            "Stage": "/Retold/tidings/test/../stage/0x560c0aa952000000/Stage/",
            "Scratch": "/Retold/tidings/test/../stage/0x560c0aa952000000/Scratch/",
            "ReportDefinition": "/Retold/tidings/test/reports/badtemplate/",
            "Common": "/Retold/tidings/test/reports/badtemplate/common/"
        }
    },
    "Status": {
        "Rendered": true,
        "CompletionProgress": 100,
        "StartTime": 1478276851016,
        "EndTime": 1478276851047,
        "CompletionTime": 31
    },
    "AssetCollectionList": [],
    "RasterizationList": [],
    "Errors": [
        {
            "Type": "Template Parsing Error",
            "Template": "index.html",
            "Location": "/Retold/tidings/test/reports/badtemplate//html",
            "Source": "<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\">\n    <title>THIS HAS AN OBVIOUSLY BAD UNDERSCORE TEMPLATE (immediately following this) <%= Datum.Name </title>\n  </head>\n  <body>\n<% Behaviors.manifestLog(Manifest, 'This is rad'); %>\n\t  <h1><%= Datum.Name %></h1>\n\t  <p>This is the default report.  For some datum.  By the way it has <%= Datum.Name.length %> bytes in the Name property.  And this report has GUID Manifest <%= Manifest.Metadata.GUIDReportDescription %>.</p>\n  </body>\n</html>",
            "GeneratedCode": "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\nwith(obj||{}){\n__p+='<!DOCTYPE html>\\n<html>\\n  <head>\\n    <meta charset=\"UTF-8\">\\n    <title>THIS HAS AN OBVIOUSLY BAD UNDERSCORE TEMPLATE (immediately following this) '+\n((__t=( Datum.Name </title>\n  </head>\n  <body>\n<% Behaviors.manifestLog(Manifest, 'This is rad'); ))==null?'':__t)+\n'\\n\t  <h1>'+\n((__t=( Datum.Name ))==null?'':__t)+\n'</h1>\\n\t  <p>This is the default report.  For some datum.  By the way it has '+\n((__t=( Datum.Name.length ))==null?'':__t)+\n' bytes in the Name property.  And this report has GUID Manifest '+\n((__t=( Manifest.Metadata.GUIDReportDescription ))==null?'':__t)+\n'.</p>\\n  </body>\\n</html>';\n}\nreturn __p;\n",
            "ValidationData": {
                "Enclosures": {
                    "Type": "Expression",
                    "Left": {},
                    "LeftCount": 5,
                    "Right": {},
                    "RightCount": 4
                },
                "CodePositions": {
                    "145": "Left",
                    "188": "Left",
                    "239": "Right",
                    "249": "Left",
                    "264": "Right",
                    "342": "Left",
                    "364": "Right",
                    "430": "Left",
                    "474": "Right"
                },
                "Warnings": [
                    "Enclosures out of balance!  This will almost definitely break your template.",
                    "Enclosure at character 145 (ending at 188) not properly balanced!",
                    "Code between 145 and 190: <%= Datum.Name </title>\n  </head>\n  <body>\n<%"
                ],
                "EnclosureBalance": -1
            }
        }
    ],
    "Templates": [
        {
            "File": "index.html",
            "Path": "/Retold/tidings/test/reports/badtemplate//html"
        }
    ],
    "Log": [
        "Fri, 30 Sep 2016 16:27:31 GMT: Creating folders at /Retold/tidings/test/../stage/0x560c0aa952000000",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Datum",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Loaded definition: /Retold/tidings/test/reports/badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Loading the Report-Specific Behaviors",
        "Fri, 30 Sep 2016 16:27:31 GMT: Parsing the Report Definition for Renderer",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Adding template [object Object]",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Executing report pre-collect",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Default behavior.",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Collecting assets...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Asset downloads complete.",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Executing calculate function...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Default behavior.",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Processing templates...",
        "Fri, 30 Sep 2016 16:27:31 GMT: Error parsing template: SyntaxError: Invalid regular expression: missing /",
        "Fri, 30 Sep 2016 16:27:31 GMT: --> Wrote stage data: index.html TO /Retold/tidings/test/../stage/0x560c0aa952000000/Stage/",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Template processing complete.",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Running rasterizer...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...auto rasterization complete.",
        "Fri, 30 Sep 2016 16:27:31 GMT: This is really rasterizey...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Executing post-render functions...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Default behavior.",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: Cleaning up temporary files...",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...persisted the Report Manifest for 0x560c0aa952000000 type badtemplate",
        "Fri, 30 Sep 2016 16:27:31 GMT: ...Report rendered.",
        "Fri, 30 Sep 2016 16:27:31 GMT: Rendering completed in 31ms"
    ]
}
```

Or more specifically, check out this section:

```
    "Errors": [
        {
            "Type": "Template Parsing Error",
            "Template": "index.html",
            "Location": "/Retold/tidings/test/reports/badtemplate//html",
            "Source": "<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\">\n    <title>THIS HAS AN OBVIOUSLY BAD UNDERSCORE TEMPLATE (immediately following this) <%= Datum.Name </title>\n  </head>\n  <body>\n<% Behaviors.manifestLog(Manifest, 'This is rad'); %>\n\t  <h1><%= Datum.Name %></h1>\n\t  <p>This is the default report.  For some datum.  By the way it has <%= Datum.Name.length %> bytes in the Name property.  And this report has GUID Manifest <%= Manifest.Metadata.GUIDReportDescription %>.</p>\n  </body>\n</html>",
            "GeneratedCode": "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\nwith(obj||{}){\n__p+='<!DOCTYPE html>\\n<html>\\n  <head>\\n    <meta charset=\"UTF-8\">\\n    <title>THIS HAS AN OBVIOUSLY BAD UNDERSCORE TEMPLATE (immediately following this) '+\n((__t=( Datum.Name </title>\n  </head>\n  <body>\n<% Behaviors.manifestLog(Manifest, 'This is rad'); ))==null?'':__t)+\n'\\n\t  <h1>'+\n((__t=( Datum.Name ))==null?'':__t)+\n'</h1>\\n\t  <p>This is the default report.  For some datum.  By the way it has '+\n((__t=( Datum.Name.length ))==null?'':__t)+\n' bytes in the Name property.  And this report has GUID Manifest '+\n((__t=( Manifest.Metadata.GUIDReportDescription ))==null?'':__t)+\n'.</p>\\n  </body>\\n</html>';\n}\nreturn __p;\n",
            "ValidationData": {
                "Enclosures": {
                    "Type": "Expression",
                    "Left": {},
                    "LeftCount": 5,
                    "Right": {},
                    "RightCount": 4
                },
                "CodePositions": {
                    "145": "Left",
                    "188": "Left",
                    "239": "Right",
                    "249": "Left",
                    "264": "Right",
                    "342": "Left",
                    "364": "Right",
                    "430": "Left",
                    "474": "Right"
                },
                "Warnings": [
                    "Enclosures out of balance!  This will almost definitely break your template.",
                    "Enclosure at character 145 (ending at 188) not properly balanced!",
                    "Code between 145 and 190: <%= Datum.Name </title>\n  </head>\n  <body>\n<%"
                ],
                "EnclosureBalance": -1
            }
        }
    ]
```

This is telling us the Underscore template does not have balanced brackets, and where it likely occurs.


# Template Paths

There are many kinds of paths which can be defined in the Templates array of a report renderer.  If the Templates array is empty, the renderer will automatically parse every file in the renderer's template folder.

Further, there is a macro expansion that happens for a Path property of templates.  For instance, you could have `{ Path:'Stage', File:'MyReport.html' }` and Tidings will automatically expand the `Stage` value to be the folder that is defined as such in the `Locations` section of the Manifest Metadata.

# Template Debugging

Underscore / lodash templates are annoying to debug.  Adding this line to your fable configuration calls an explicit `debugger` command to break at the exact point a template has failed.

```
{
    "TidingsDebug":true
}
```

## Single Template File

```
{
    "File": "index.html",
    "Path": "/Retold/tidings/test/reports/budgetanalysis/html"
}
```

## Recursive folder scan
```
{
    "File": "*",
    "Path": "/my/custom/reports/folder",
    "Recursive": true
}
```

## Dependency on other Renderer
```
{
    "Renderer": "html",
    "Recursive": true,
    "File": "*",
    "Path": "ReportDefinition"
}
```

or simply:
```
{
    "Renderer": "html"
}
```

# Recipes for the `report.js` File:

## Add a Post-Render step to delete all assets that were collected during rendering:
```
postRender: (pState, fCallback) =>
{
	// Call this to delete assets after render.
	pState.Behaviors.deleteAssets(pState,fCallback);
	// Or this to keep them.
	//fCallback(false, pState);
}
```

# Other Resources to look into:

Muze allows interactive data dashboards: https://www.charts.com/muze

## Related Packages

- [orator](https://github.com/fable-retold/orator) - API server abstraction
- [fable](https://github.com/fable-retold/fable) - Application services framework

## License

MIT

## Contributing

Pull requests are welcome. For details on our code of conduct, contribution process, and testing requirements, see the [Retold Contributing Guide](https://github.com/fable-retold/retold/blob/main/docs/contributing.md).
