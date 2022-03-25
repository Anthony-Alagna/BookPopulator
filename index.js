"use strict";

import { Client } from "@notionhq/client";
import got from "got";
import fs from "fs";
import { formatWithOptions } from "util";
import { randomInt } from "crypto";

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

async function queryNotionDatabase() {
  try {
    const response = await notion.databases.query({ database_id: databaseId });
    const results = response.results;
    return results; //refactor to return the notionPageObjects
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
  }
  return googleBooksResponse;
}

async function fileUpdate(input) {
  // this function is used to cache the googleBooksAPI response data,
  // updates the googleBooksResponse.JSON file with any new data when a
  // title is added to the notion database
  const data = JSON.stringify(input);
  fs.writeFile("./notionPages.JSON", data, "utf8", (err) => {
    if (err) {
      console.log("error writing file:" + err);
    } else {
      console.log("File written sucessfully!");
    }
  });
}

async function GoogleBooksAPISearch(bookTitle) {
  var url = urlMaker(bookTitle);
  //GET request to GoogleBooksAPI returns response as JSON object
  return got(url).json();
}

async function updateProperties() {
  //this method takes the GoogleBooksData returned by the Google Books API in JSON format and
  // matches each element in GoogleBooksData[] by title to its associated notionPageID
  //the notionPageID is necessary because this is how we will select each page to be updated by the
  //notion.pages.update() function
  let pageTitles = await extractPageTitles();
  let notionPagesJSON = await queryNotionDatabase();
  let googleJSONDataArray =  await GoogleBooksAPIData(pageTitles);
  let colors = ["brown", "blue", "red", "green", "orange"];
  let pageIDs = [];
  let bookPublishers = [];
  let bookAuthor = [];
  let bookSummary = [];
  let bookPublishDate = [];
  let bookGenres = [];
  let reg = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
  let reg1 = /^\d{4}-(0[1-9]|1[0-2])/
  let reg2 =/\d{4}/
  let reg3 = /\d{3}/

  for (let index = 0; index < notionPagesJSON.length; index++) {
    pageIDs[index] = notionPagesJSON[index].id;
  }
  for (let index = 0; index < googleJSONDataArray.length; index++) {
    bookPublishers[index] = googleJSONDataArray[index].publisher
    bookAuthor[index] = googleJSONDataArray[index].authors[0]
    if (bookPublishers[index] == undefined) {
      bookPublishers[index] = "?";
    }
    if(bookSummary[index] == undefined){
      bookSummary[index] = "?";
    }
    if(googleJSONDataArray[index].description != undefined){
      bookSummary[index] =  truncateString(googleJSONDataArray[index].description, 500)
    }
    if(googleJSONDataArray[index].publishedDate.search(reg) == 0){
      bookPublishDate[index] = googleJSONDataArray[index].publishedDate
    }
    else if(googleJSONDataArray[index].publishedDate.search(reg1) == 0){
      bookPublishDate[index] =  googleJSONDataArray[index].publishedDate +"-01"

    }
    else if(googleJSONDataArray[index].publishedDate.search(reg2) == 0){
      bookPublishDate[index] =  googleJSONDataArray[index].publishedDate +"-01-01"
    }
    else if(googleJSONDataArray[index].publishedDate.search(reg3) == 0){
      console.log("The problem is at index ["+ index + "] with value: " + googleJSONDataArray[index]);
      bookPublishDate[index] = "0" + googleJSONDataArray[index].publishedDate
      console.log("New Value = " + bookPublishDate[index]); 
    }


  //end main assignment loop
  }
  console.log(bookPublishDate);

  
   for (let index = 0; index < notionPagesJSON.length; index++) {
    await notion.pages.update({
      page_id: pageIDs[index],
      properties:{
        "Publisher":{
          "select":{
            "name": bookPublishers[index],
          },
        },
        "Author":{
          "select":{
            "name": bookAuthor[index],
          },
        },
        "Summary":{
          "rich_text":[{
            "type": "text",
            "text":{
              "content": bookSummary[index]
            },
          }],
        },
        "Publishing/Release Date":{
          "date": {
            "start": bookPublishDate[index], "end": null, "time_zone": null
          },
        },
      },
    });
    
  } 

}


//helper functions

function urlMaker(searchTerm) {
  //Takes the search term, replaces any spaces with + for the URl, then concantinates into the final
  //URL to send as a 'GET' request to giphy API
  let re = /\s/g;
  var st = searchTerm.replace(re, "+");
  var baseUrl = "https://www.googleapis.com/books/v1/volumes?";
  var finalurl = baseUrl + "q=" + st;
  return finalurl;
}
async function extractPageTitles(){
  const pages = await queryNotionDatabase();
  var pageTitles = [];
  for (let index = 0; index < pages.length; index++) {
    pageTitles[index] = pages[index].properties.Name.title[0].plain_text;
  }
  return pageTitles;
}
function truncateString(string, limit) {
  if (string.length > limit) {
    return string.substring(0, limit) + "..."
  } else {
    return string
  }
}

updateProperties();

