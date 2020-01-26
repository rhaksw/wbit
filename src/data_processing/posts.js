import { getItems } from 'api/reddit'
import {
  getPostsBySubredditOrDomain as pushshiftGetPostsBySubredditOrDomain,
  queryPosts as pushshiftQueryPosts
} from 'api/pushshift'
import { itemIsRemovedOrDeleted, postIsDeleted, display_post,
         getUniqueItems, SimpleURLSearchParams
} from 'utils'
import { REMOVAL_META, AUTOMOD_REMOVED, AUTOMOD_REMOVED_MOD_APPROVED,
         MOD_OR_AUTOMOD_REMOVED, UNKNOWN_REMOVED, NOT_REMOVED, USER_REMOVED,
         AUTOMOD_LATENCY_THRESHOLD } from 'pages/common/RemovedBy'

export const byScore = (a, b) => {
  return (b.stickied - a.stickied) || (b.score - a.score)
      || (b.num_comments - a.num_comments)
}
export const byDate = (a, b) => {
  return (b.stickied - a.stickied) || (b.created_utc - a.created_utc)
      || (b.num_comments - a.num_comments)
}
export const byNumComments = (a, b) => {
  return (b.stickied - a.stickied) || (b.num_comments - a.num_comments)
      || (b.created_utc - a.created_utc)
}
export const byControversiality = (a, b) => {
  return (b.stickied - a.stickied) || (a.score - b.score)
      || (b.num_comments - a.num_comments)
}
export const byNumCrossposts = (a, b) => {
  if ('num_crossposts' in a && 'num_crossposts' in b) {
    return (b.num_crossposts - a.num_crossposts) || (b.num_comments - a.num_comments)
        || (b.created_utc - a.created_utc)
  } if ('num_crossposts' in a) {
    return -1
  } else if ('num_crossposts' in b) {
    return 1
  } else {
    return (b.created_utc - a.created_utc)
  }
}

export const retrieveRedditPosts_and_combineWithPushshiftPosts = (pushshiftPosts, includePostsWithZeroComments = false) => {
  const ids = pushshiftPosts.map(post => post.name)
  return getItems(ids)
  .then(redditPosts => {
    return combinePushshiftAndRedditPosts(pushshiftPosts, redditPosts, includePostsWithZeroComments)
  })
}

export const getRevdditPosts = (pushshiftPosts) => {
  return retrieveRedditPosts_and_combineWithPushshiftPosts(pushshiftPosts)
}

export const combinePushshiftAndRedditPosts = (pushshiftPosts, redditPosts, includePostsWithZeroComments = false, isInfoPage = false) => {
  const redditPosts_lookup = {}
  redditPosts.forEach(post => {
    redditPosts_lookup[post.id] = post
  })
  const pushshiftPosts_lookup = {}
  const missingPosts = []
  pushshiftPosts.forEach(post => {
    pushshiftPosts_lookup[post.id] = post
    if (! redditPosts_lookup[post.id]) {
      missingPosts.push(post.id)
    }
  })
  if (missingPosts.length) {
    console.log('missing posts: '+missingPosts.join(' '))
  }
  const show_posts = []
  redditPosts.forEach(post => {
    post.selftext = ''
    const ps_item = pushshiftPosts_lookup[post.id]
    let retrievalLatency = undefined
    if (ps_item) {
      retrievalLatency = ps_item.retrieved_on-ps_item.created_utc
    }
    if (post.crosspost_parent_list) {
      post.num_crossposts += post.crosspost_parent_list.reduce((total,x) => total+x.num_crossposts,0)
    }
    if (itemIsRemovedOrDeleted(post)) {
      if (postIsDeleted(post)) {
        if (post.num_comments > 0 || includePostsWithZeroComments) {
          post.deleted = true
          display_post(show_posts, post, ps_item, isInfoPage)
        } else {
          // not showing deleted posts with 0 comments
        }
      } else {
        post.removed = true
        if (ps_item && 'is_robot_indexable' in ps_item && ! ps_item.is_robot_indexable) {
          if (retrievalLatency !== undefined && retrievalLatency <= AUTOMOD_LATENCY_THRESHOLD) {
            post.removedby = AUTOMOD_REMOVED
          } else {
            post.removedby = UNKNOWN_REMOVED
          }
        } else {
          post.removedby = MOD_OR_AUTOMOD_REMOVED
        }
        display_post(show_posts, post, ps_item, isInfoPage)
      }
    } else {
      // not-removed posts
      if (ps_item && 'is_robot_indexable' in ps_item && ! ps_item.is_robot_indexable) {
        post.removedby = AUTOMOD_REMOVED_MOD_APPROVED
        //show_posts.push(post)
      } else {
        post.removedby = NOT_REMOVED
      }
      show_posts.push(post)
    }
  })
  return show_posts
}

export const getRevdditPostsByDomain = (domain, global) => {
  const {n, before, before_id} = global.state
  global.setLoading('')
  if (window.location.pathname.match(/^\/r\/([^/]*)\/.+/g)) {
    window.history.replaceState(null,null,`/r/${domain}/`+window.location.search)
  }
  return pushshiftGetPostsBySubredditOrDomain({domain, n, before, before_id})
  .then(retrieveRedditPosts_and_combineWithPushshiftPosts)
  .then(show_posts => {
    global.setSuccess({items:show_posts})
    return show_posts
  })
}

const getMinimalPostPath = (path) => {
  return path.split('/').slice(0,5).join('/')
}

const getYoutubeURLs = (id) => {
  return [`https://youtu.be/${id}`,`https://www.youtube.com/watch?v=${id}`]
}

const getUrlMeta = (url) => {
  const redditlikeDomainStripped = url.replace(/^https?:\/\/[^/]*(reddit\.com|removeddit\.com|ceddit\.com|unreddit\.com|snew\.github\.io|snew\.notabug\.io|politicbot\.github\.io|r\.go1dfish\.me|reve?ddit\.com)/i,'')
  const isRedditDomain = redditlikeDomainStripped.match(/^\//)
  const isRedditPostURL = redditlikeDomainStripped.match(/^\/r\/[^/]*\/comments\/[a-z0-9]/i)
  let normalizedPostURLs = [url]
  const isYoutubeURL = url.match(/^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)(\/.+)/i)
  if (isRedditPostURL) {
    normalizedPostURLs = [getMinimalPostPath(redditlikeDomainStripped)]
  } else if (isYoutubeURL && isYoutubeURL[2]) {
    if (isYoutubeURL[1] === 'youtube.com') {
      const params = new SimpleURLSearchParams(isYoutubeURL[2].split('?')[1])
      const v = params.get('v')
      if (v) {
        normalizedPostURLs = getYoutubeURLs(v)
      }
    } else {
      normalizedPostURLs = getYoutubeURLs(isYoutubeURL[2].split('?')[0])
    }
  }
  const postURL_ID = redditlikeDomainStripped.split('/')[4]
  return {isRedditDomain, isRedditPostURL, normalizedPostURLs, postURL_ID}
}

export const getRevdditDuplicatePosts = (threadID, global) => {
  global.setLoading('')
  return getItems(threadID.split('+').map(id => 't3_'+id))
  .then(redditPosts => {
    const promises = []
    const urls = []
    const selftext_urls = []
    redditPosts.forEach(async drivingPost => {
      const {isRedditDomain, isRedditPostURL, normalizedPostURLs, postURL_ID} = getUrlMeta(drivingPost.url)
      urls.push(...normalizedPostURLs)
      if (isRedditPostURL) {
        const drivingPost_url_post = await getItems(['t3_'+postURL_ID])
        if (drivingPost_url_post.length) {
          const drivingPost_url_post_url = drivingPost_url_post[0].url
          const {isRedditPostURL: isRedditPostURL_2, normalizedPostURLs: normalizedPostURLs_2} = getUrlMeta(drivingPost_url_post_url)
          if (isRedditPostURLs_2) {
            urls.push(...normalizedPostURLs_2)
          } else {
            urls.push(drivingPost_url_post_url)
          }
        }
      }
      if (! isRedditPostURL) {
        const minimalPostPath = getMinimalPostPath(drivingPost.permalink)
        urls.push(minimalPostPath)
        selftext_urls.push(minimalPostPath)
      }
      if (! isRedditDomain || isRedditPostURL) {
        selftext_urls.push(...normalizedPostURLs)
      }
    })
    if (urls.length) {
      promises.push(pushshiftQueryPosts({url: urls.join('|')}))
    }
    if (selftext_urls.length) {
      promises.push(
        pushshiftQueryPosts(
          {selftext:
            selftext_urls.map(u => '"'+u+'"').join('|')
          }
        ))
    }
    return Promise.all(promises)
    .then(results => {
      if (results.length === 1) {
        return results[0]
      } else {
        return getUniqueItems(results)
      }
    })
    .then((pushshiftPosts) => retrieveRedditPosts_and_combineWithPushshiftPosts(pushshiftPosts, true))
    .then(items => {
      global.setSuccess({items})
      return items
    })
  })
}
