'use strict'
const Alexa = require('ask-sdk')
const cheerio = require('cheerio')
const axios = require('axios')
const ihsScheduleUrl = 'https://www.holmdelschools.org/schools/indian-hill-school-4-6/daily-announcements'
const ssScheduleUrl = 'https://www.holmdelschools.org/schools/wr-satz-school-7-8/daily-announcements'
const htmlRetrievalErrorText = 'I\'m sorry, I was unable to retrieve the schedule for today at '

let skill

const ErrorHandler = {
  canHandle (handlerInput) {
    return true
  },
  async handle (handlerInput) {
    var speechText = 'Sorry, I can\'t understand the command. Please say again.'
    var repromptText = 'Sorry, I can\'t understand the command. Please say again.'

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard('Schedule day at Holmdel Schools', speechText)
      .withShouldEndSession(true)
      .getResponse()
  }
}

const HelpIntentHandler = {
  canHandle (handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.FallbackIntent' ||
      request.intent.name === 'AMAZON.HelpIntent')
  },
  async handle (handlerInput) {
    var speechText = 'I currently support Indian Hill\'s 6 day schedule for fourth, fifth and sixth grade and '
    speechText += 'Satz School\'s 4 day schedule for seventh and eight grade. '
    speechText += 'You can ask me, what day is it, what day is it at Indian Hill School and what day is it at Satz School '
    var repromptText = ''

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard('Schedule day at Holmdel Schools', speechText)
      .getResponse()
  }
}

const CancelAndStopIntentHandler = {
  canHandle (handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.CancelIntent' ||
      request.intent.name === 'AMAZON.StopIntent')
  },
  async handle (handlerInput) {
    var speechText = 'OK'
    var repromptText = ''

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard('Schedule day at Holmdel Schools', speechText)
      .withShouldEndSession(true)
      .getResponse()
  }
}

const LaunchRequestHandler = {
  canHandle (handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
      (request.type === 'IntentRequest' &&
      request.intent.name === 'dayandschool')
  },
  async handle (handlerInput) {
    var resp = ''
    var scheduleDate = ''
    var scheduleDay = ''
    var speechText = ''
    var repromptText = ''

    const intent = handlerInput.requestEnvelope.request.intent
    console.log('intent.name2 = ' + intent.name)

    var slotValue = ''
    if (intent.name === 'dayandschool' &&
       intent.slots['School'].name === 'School' &&
       intent.slots['School'].resolutions &&
       intent.slots['School'].resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH' &&
       intent.slots['School'].resolutions.resolutionsPerAuthority[0].values[0].value.name !== '') {
      slotValue = intent.slots['School'].resolutions.resolutionsPerAuthority[0].values[0].value.name
    }

    // Indian Hill School slot value provided. Handle request
    if (intent.name === 'dayandschool' &&
       intent.slots['School'].name === 'School' &&
       intent.slots['School'].resolutions &&
       intent.slots['School'].resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH' &&
       intent.slots['School'].resolutions.resolutionsPerAuthority[0].values[0].value.name === 'Indian Hill School') {
      try {
        slotValue = intent.slots['School'].resolutions.resolutionsPerAuthority[0].values[0].value.name
        resp = await getUrlContent(ihsScheduleUrl)
        scheduleDay = getIhsScheduleDay(resp)
        console.log('scheduleDay is ' + scheduleDay)
        scheduleDate = getIhsScheduleDate(resp)
        console.log('scheduleDate is ' + scheduleDate)
        speechText = scheduleDate + ' is a ' + scheduleDay + ' day at ' + slotValue
      } catch (e) {
        slotValue = intent.slots['School'].resolutions.resolutionsPerAuthority[0].values[0].value.name
        console.log('caught exception ' + e)
        speechText = htmlRetrievalErrorText + slotValue
      }
    // Satz School slot value provided. Handle request
    } else if (intent.name === 'dayandschool' &&
       intent.slots['School'].name === 'School' &&
       intent.slots['School'].resolutions &&
       intent.slots['School'].resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH' &&
       intent.slots['School'].resolutions.resolutionsPerAuthority[0].values[0].value.name === 'Satz School') {
      try {
        slotValue = intent.slots['School'].resolutions.resolutionsPerAuthority[0].values[0].value.name
        resp = await getUrlContent(ssScheduleUrl)
        scheduleDay = getSsScheduleDay(resp)
        console.log('scheduleDay is ' + scheduleDay)
        scheduleDate = getSsScheduleDate(resp)
        console.log('scheduleDate is ' + scheduleDate)
        speechText = scheduleDate + ' is a ' + scheduleDay + ' day at ' + slotValue
      } catch (e) {
        console.log('caught exception ' + e)
        slotValue = intent.slots['School'].resolutions.resolutionsPerAuthority[0].values[0].value.name
        speechText = htmlRetrievalErrorText + slotValue
      }
    // No school provided. Reprompt using Alexa Slot Filling
    } else {
      console.log('no slot provided, reprompt')
      return handlerInput.responseBuilder
        .addDelegateDirective(intent)
        .getResponse()
    }

    if (slotValue === '') {
      slotValue = 'Holmdel Schools'
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard('Schedule day at ' + slotValue, speechText)
      .addConfirmIntentDirective()
      .withShouldEndSession(true)
      .getResponse()
  }
}

/*
module.exports.hello = async (event, context) => {
  const resp = await axios.get(ihsScheduleUrl)
  var scheduleDate = ''
  try {
    scheduleDate = getIhsScheduleDate(resp)
  } catch (e) {
    console.log('caught exception')
    scheduleDate = 'I\'m sorry, I was unable to retrieve the schedule for today.'
  }
  var scheduleDay = getIhsScheduleDay(resp)

  return {
    statusCode: 200,
    body: JSON.stringify({
      schoolDate: scheduleDate,
      scheduleDay: scheduleDay
    })
  }

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
}
*/

module.exports.alexaschoolschedule = async (event, context) => {
  if (!skill) {
    skill = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        ErrorHandler
        // SessionEndedRequestHandler
      )
      .addErrorHandlers(ErrorHandler)
      .create()
  }

  const alexaResponse = await skill.invoke(event, context)
  return alexaResponse
}

async function getUrlContent (url) {
  const resp = await axios.get(url)
  return resp
}

function getIhsScheduleDate (resp) {
  const $ = cheerio.load(resp.data)

  var dateAndScheduleHtml = $('#fsEl_5447').find('strong').html()
  var dateAndScheduleArr = dateAndScheduleHtml.split(' ')
  var scheduleDate = new Date(dateAndScheduleArr[0] + ' ' + dateAndScheduleArr[1] + ' ' + dateAndScheduleArr[2])
  // scheduleDate = new Date('bad date')

  console.log(scheduleDate.toDateString())

  if (scheduleDate.toDateString() === 'Invalid Date') {
    throw ('Invalid Date')
  }

  /*
  dateAndScheduleArr.forEach(function (element) {
    console.log(element)
  })
  */

  return scheduleDate.toDateString()
}

function getIhsScheduleDay (resp) {
  const $ = cheerio.load(resp.data)

  var dateAndScheduleHtml = $('#fsEl_5447').find('strong').html()
  var dateAndScheduleArr = dateAndScheduleHtml.split(' ')
  // var schoolDate = new Date('bad date test')

  var scheduleDay = dateAndScheduleArr[5].split(';')[1].split('&')[0]

  /*
  dateAndScheduleArr.forEach(function (element) {
    console.log(element)
  })
  */

  return scheduleDay
}

function getSsScheduleDate (resp) {
  const $ = cheerio.load(resp.data)

  var dateAndScheduleHtmlArr = $('#fsEl_5468').children('.fsElementContent').children('p').next().next().next().children('strong') // .filter('strong')
  var scheduleDateArr = dateAndScheduleHtmlArr.html().split(' ')
  var currentYear = (new Date()).getFullYear()
  var day = scheduleDateArr[2].replace(/\D/g, '')
  console.log('month = ' + scheduleDateArr[1] + ' day = ' + day + ' year = ' + currentYear)
  var scheduleDate = new Date(scheduleDateArr[1] + ' ' + day + ' ' + currentYear)
  // scheduleDate = new Date('bad date')

  console.log(scheduleDate.toDateString())

  if (scheduleDate.toDateString() === 'Invalid Date') {
    throw ('Invalid Date')
  }

  // dateAndScheduleArr.forEach(function (element) {
  //  console.log(element)
  // })
  return scheduleDate.toDateString()
}

function getSsScheduleDay (resp) {
  // console.log('html2 = ' + resp.data)
  const $ = cheerio.load(resp.data)
  // console.log('Cheerio HTML = ' + $.html())

  var dateAndScheduleHtmlArr = $('#fsEl_5468').children('.fsElementContent').children('p').next().next().next().next().children('strong') // .filter('strong')
  console.log('HTML length = ' + dateAndScheduleHtmlArr.length + ' schedule Day html = ' + dateAndScheduleHtmlArr.html())
  var scheduleDayArr = dateAndScheduleHtmlArr.html().split(' ')
  // var schoolDate = new Date('bad date test')
  var scheduleDay = scheduleDayArr[0]

  // dateAndScheduleHtmlArr.forEach(function (element) {
  //  console.log(element)
  // })
  console.log(scheduleDay)

  return scheduleDay
}
