"use strict";

import { Client } from "@notionhq/client";
import { Console } from "console";
import got from "got";
import fs from "fs";

const notion = new Client({ auth: process.env.NOTION_KEY });
//const axios = require('axios');

const databaseId = process.env.NOTION_DATABASE_ID;

async function addItem(text) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: text,
              },
            },
          ],
        },
      },
    });
    console.log(response);
    console.log("Success! Entry added.");
  } catch (error) {
    console.error(error.body);
  }
}

async function queryAPIs() {
  try {
    const response = await notion.databases.query({ database_id: databaseId });
    const results = response.results;
    var notionPageTitles = [];
    for (let index = 0; index < results.length; index++) {
      notionPageTitles[index] =
        response.results[index].properties.Name.title[0].plain_text;
      //console.log(element);
    }
    console.log("notionPageTitles =" + notionPageTitles);
    await GoogleBooksAPIData(notionPageTitles);
    return notionPageTitles;
  } catch (error) {
    console.error(error.body);
  }
}

async function GoogleBooksAPIData(titlesArray) {
  let googleBooksResponse = [];
  for (let index = 0; index < titlesArray.length; index++) {
    googleBooksResponse[index] = await GoogleBooksAPISearch(titlesArray[index]);
    googleBooksResponse[index] = googleBooksResponse[index].items[0].volumeInfo;
    //select only the data we need about each book
    // from the full googlebooksresponse
    // splits each related book data up into
    return googleBooksResponse;
  }
}

async function fileUpdate(data) {
  //refactor
  const data = JSON.stringify(googleBooksResponse);
  fs.writeFile("./googleBooksResponses.JSON", data, "utf8", (err) => {
    if (err) {
      console.log("error writing file:" + err);
    } else {
      console.log("File written sucessfully!");
    }
  });
}

async function GoogleBooksAPISearch(bookTitle) {
  var url = urlMaker(bookTitle);
  return got(url).json();
}

async function updateProperties(GoogleBooksData, notionPageIDs) {
  //this method takes the GoogleBooksData returned by the Google Books API in JSON format and
  // matches each element in GoogleBooksData[] by title to its associated notionPageID
  //the notionPageID is necessary because this is how we will select each page to be updated by the
  //notion.pages.update() function
}

function urlMaker(searchTerm) {
  //Takes the search term, replaces any spaces with + for the URl, then concantinates into the final
  //URL to send as a 'GET' request to giphy API
  let re = /\s/g;
  var st = searchTerm.replace(re, "+");
  var baseUrl = "https://www.googleapis.com/books/v1/volumes?";
  var finalurl = baseUrl + "q=" + st;
  return finalurl;
}

console.log(queryAPIs());

//addItem("Yurts in Big Sur, California")
