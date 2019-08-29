import React from 'react'
import { withRouter } from 'react-router'
import { prettyScore, parse, redditThumbnails, isDeleted } from 'utils'
import Time from 'pages/common/Time'
import RemovedBy from 'pages/common/RemovedBy'
import { NOT_REMOVED } from 'pages/common/RemovedBy'

class Post extends React.Component {
  state = {
    displayFullSelftext: false
  }
  displayFullSelftext() {
    this.setState({displayFullSelftext: true})
  }
  render() {
    const props = this.props
    if (!props.title) {
      return <div />
    }

    const current_page = `${this.props.location.pathname}${this.props.location.search}`
    const reddit = 'https://www.reddit.com'
    const mods_message_body = '\n\n\n'+reddit+props.permalink;
    const mods_link = reddit+'/message/compose?to='+props.subreddit+'&message='+encodeURI(mods_message_body);
    let message_mods = ''
    if (props.removed || props.removedby && props.removedby !== NOT_REMOVED) {
      message_mods = <a href={mods_link} target="_blank">message mods</a>
    }
    let url = props.url.replace('https://www.reddit.com', '')

    const userLink = isDeleted(props.author) ? undefined : `/user/${props.author}`

    let thumbnail
    const thumbnailWidth = props.thumbnail_width ? props.thumbnail_width * 0.5 : 70
    const thumbnailHeight = props.thumbnail_height ? props.thumbnail_height * 0.5 : 70

    if (redditThumbnails.includes(props.thumbnail)) {
      thumbnail = <a href={url} className={`thumbnail thumbnail-${props.thumbnail}`} />
    } else if (props.thumbnail !== '' && props.thumbnail !== 'spoiler') {
      thumbnail = (
        <a href={url}>
          <img className='thumbnail' src={props.thumbnail} width={thumbnailWidth} height={thumbnailHeight} alt='Thumbnail' />
        </a>
      )
    }
    let selftext_snippet = props.selftext
    const max_length = 100
    let snippet_is_set = false
    if (props.selftext && props.selftext.length > max_length + 10) {
      snippet_is_set = true
      selftext_snippet = props.selftext.substring(0,max_length)+'...'
    }
    let directlink = ''
    if (props.prev) {
      directlink = `?after=${props.prev}&`
    } else if (props.next) {
      directlink = `?before=${props.next}&`
    }
    if (directlink) {
      directlink += `limit=1&sort=${props.sort}&show=${props.name}&removal_status=all`
    }

    return (
      <div id={props.name} className={`post thread
            ${props.locked ? 'locked':''}
            ${props.stickied ? 'stickied':''}
            ${props.removed ? 'removed':''}
            ${props.unknown ? 'unknown':''}
            ${props.deleted ? 'deleted' : ''}`}
            data-created_utc={props.created_utc} >
        {props.position &&
        <span className='post-rank'>{props.position}</span>}
        <div className='thread-score-box'>
          <div className='vote upvote' />
          <div className='thread-score'>{prettyScore(props.score)}</div>
          <div className='vote downvote' />
        </div>
        {thumbnail}
        <div className='thread-content'>
          <a className='thread-title' href={url}>{props.title}</a>
          {
            props.link_flair_text &&
            <span className='link-flair'>{props.link_flair_text}</span>
          }
          <span className='domain'>({props.domain})</span>
          <div className='thread-info'>
            submitted <Time created_utc={props.created_utc}/> by&nbsp;
            <a className={`author ${props.distinguished ? 'distinguished '+props.distinguished : ''}`}
              href={userLink}>{props.author}</a>
            &nbsp;to <a className='subreddit-link' href={`/r/${props.subreddit}`}>/r/{props.subreddit}</a>
            {props.locked && <>&nbsp;<span className='locked'>locked</span></>}
            &nbsp;<RemovedBy removedby={props.removedby} />
          </div>
          {props.selftext &&
            <div className='thread-selftext user-text'>
              <div dangerouslySetInnerHTML={{ __html: this.state.displayFullSelftext ? parse(props.selftext) : parse(selftext_snippet) }}/>
              {!this.state.displayFullSelftext && snippet_is_set &&
                <p>
                  <a className='collapseToggle' onClick={() => this.displayFullSelftext()}>
                    ... view full text
                  </a>
                </p>
              }
            </div>
          }
          <div className='total-comments post-links'>
            {props.quarantine && <span className="quarantined">quarantined</span>}
            { directlink && <a href={directlink}>directlink</a>}
            <a href={props.permalink}>{props.num_comments} comments</a>
            <a href={`${current_page}#${props.name}`}>hashlink</a>
            <a href={`https://www.reddit.com${props.permalink}`}>reddit</a>
            {message_mods}
          </div>
        </div>
        <div className='clearBoth'></div>
      </div>
    )
  }
}
export default withRouter(Post)
