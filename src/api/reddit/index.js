import { chunk, flatten } from 'utils'
import { getAuth } from './auth'

const errorHandler = (e) => {
  throw new Error(`Could not connect to Reddit: ${e}`)
}


// Thread = Post + Comments
// Return the post itself
export const getPost = (subreddit, threadID) => {
  var url = new URL(`https://oauth.reddit.com/r/${subreddit}/comments/${threadID}/_/`)
  var params = {raw_json:1}
  url.search = new URLSearchParams(params)
  return getAuth()
    .then(auth => window.fetch(url, auth))
    .then(response => response.json())
    .then(thread => thread[0].data.children[0].data)
    .catch(errorHandler)
}

// Fetch multiple threads (via the info endpoint)
export const getPosts = postIDs => {
  var url = new URL(`https://oauth.reddit.com/api/info`)
  var ids = postIDs.map(id => `t3_${id}`)
  var params = {id: ids.join(), raw_json:1}
  url.search = new URLSearchParams(params)
  return getAuth()
    .then(auth => window.fetch(url, auth))
    .then(response => response.json())
    .then(response => response.data.children.map(data => data.data))
    .catch(errorHandler)
}

// Helper function that fetches a list of comments
const fetchComments = (commentIDs, auth) => {
  var url = new URL(`https://oauth.reddit.com/api/info`)
  var ids = commentIDs.map(id => `t1_${id}`)
  var params = {id: ids.join(), raw_json:1}
  url.search = new URLSearchParams(params)
  return window.fetch(url, auth)
    .then(response => response.json())
    .then(results => results.data.children)
    .then(commentsData => commentsData.map(commentData => commentData.data))
}

export const getComments = commentIDs => {
  return getAuth()
    .then(auth => (
      Promise.all(chunk(commentIDs, 100)
        .map(ids => fetchComments(ids, auth)))
        .then(flatten)
    ))
    .catch(errorHandler)
}

export const getItems = ids => {
  return getAuth()
    .then(auth => (
      Promise.all(chunk(ids, 100)
      .map(ids_chunk => queryByID(ids_chunk, auth)))
      .then(flatten)
      .catch(errorHandler)
    ))
}



export const queryUserPage = (user, kind, sort, before, after, limit = 100) => {
  var url = new URL(`https://oauth.reddit.com/user/${user}/${kind}.json`)
  var params = {sort: sort, after: after, before: before, limit: limit, raw_json:1}
  url.search = new URLSearchParams(params)
  return getAuth()
    .then(auth => window.fetch(url, auth))
    .then(response => response.json())
    .then(results => {
      return {items: results.data.children.map(item => item.data),
              after: results.data.after} })
    .catch(errorHandler)
}


export const queryByID = (ids, auth) => {
  var url = new URL('https://oauth.reddit.com/api/info')
  var params = {id: ids.join(), raw_json:1}
  url.search = new URLSearchParams(params)
  return window.fetch(url, auth)
  .then(response => response.json())
  .then(results => results.data.children)
  .then(data => data.map(thing => thing.data))
  .catch(errorHandler)
}

// Results must include a post w/created_utc less than encompass_created_utc
// reference on async recursion w/promises: https://blog.scottlogic.com/2017/09/14/asynchronous-recursion.html#asynchronous-recursion-with-promises
export const querySubredditPageUntil = (sub, encompass_created_utc, after = '') => {
  return querySubredditPage(sub, 'new', after).then(
    data => {
      if (data.posts.slice(-1)[0].created_utc > encompass_created_utc && data.after) {
        return querySubredditPageUntil(sub, encompass_created_utc, data.after)
        .then(nextData => data.posts.concat(nextData))
      } else {
        return data.posts
      }
    })
}

export const querySubredditPage = (subreddit, sort, after = '') => {
  var url = new URL(`https://oauth.reddit.com/r/${subreddit}/${sort}.json`)
  var params = {after: after, limit: 100, raw_json:1}
  url.search = new URLSearchParams(params)
  return getAuth()
    .then(auth => window.fetch(url, auth))
    .then(response => response.json())
    .then(results => {
      return {posts: results.data.children.map(post => post.data),
              after: results.data.after} })
    .catch(errorHandler)
}


export const querySearchPageByUser = (user, sort, after = '') => {
  var url = new URL(`https://oauth.reddit.com/search.json`)
  var params = {q:`author:${user}`, sort:sort, after:after, limit:100, t:'all', include_over_18:'on'}
  url.search = new URLSearchParams(params)
  return getAuth()
    .then(auth => window.fetch(url, auth))
    .then(response => response.json())
    .then(results => {
      return {posts: results.data.children.map(post => post.data),
              after: results.data.after} })
    .catch(errorHandler)
}
