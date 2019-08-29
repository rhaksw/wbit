import '@babel/polyfill'
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom'
import { Provider } from 'unstated'
import { ApolloProvider } from 'react-apollo'
import ApolloClient from 'apollo-boost'

import DefaultLayout from 'pages/DefaultLayout'
import About from 'pages/about'
import Info from 'pages/info'
import SubredditPosts from 'pages/subreddit'
import SubredditComments from 'pages/subreddit/comments'
import Thread from 'pages/thread'
import User from 'pages/user'
import { BlankUser, BlankSubreddit } from 'pages/blank'
import NotFound from 'pages/404'
import Modal from 'react-modal'

const apolloClient = new ApolloClient({
  uri: "https://api.revddit.com/v1/graphql"
})


class App extends React.Component {

  render() {
    return (
      <ApolloProvider client={apolloClient}>
        <Provider>
          <BrowserRouter basename={__dirname}>
            <Switch>
              <Redirect exact from='/' to='/about' />
              <Redirect from='/u/*' to='/user/*' />
              <Redirect from='/u/' to='/user/' />
              <Route path="/usr/" component={({ location }) => (
                  <Redirect
                    to={{
                      ...location,
                      pathname: location.pathname.replace(/\/usr/, '/user')
                    }} /> )}
              />
              <Route path="/v/" component={({ location }) => (
                  <Redirect
                    to={{
                      ...location,
                      pathname: location.pathname.replace(/\/v/, '/r')
                    }} /> )}
              />
              <Route path="/api/info/" component={({ location }) => (
                  <Redirect
                    to={{
                      ...location,
                      pathname: location.pathname.replace(/api\/info/, 'info')
                    }} /> )}
              />
              <DefaultLayout path='/about' component={About} />
              <DefaultLayout path='/info' page_type='info' component={Info} />
              <DefaultLayout path='/search' page_type='search' component={Info} />
              <DefaultLayout path='/r/:subreddit/comments/:threadID/:urlTitle/:commentID' page_type='thread' component={Thread} />
              <DefaultLayout path='/r/:subreddit/comments/:threadID/:urlTitle' page_type='thread' component={Thread} />
              <DefaultLayout path='/r/:subreddit/comments/:threadID' page_type='thread' component={Thread} />
              <DefaultLayout path='/r/:subreddit/comments/' page_type='subreddit_comments' component={SubredditComments} />
              <DefaultLayout path='/r/:subreddit' page_type='subreddit_posts' component={SubredditPosts} />
              <DefaultLayout path='/r/' page_type='blank_subreddit' component={BlankSubreddit} />
              <DefaultLayout path='/domain/all' component={NotFound} />
              <DefaultLayout path='/domain/:domain' page_type='domain_posts' component={SubredditPosts} />
              <DefaultLayout path='/user/:userSubreddit/comments/:threadID/:urlTitle/:commentID' page_type='thread' component={Thread} />
              <DefaultLayout path='/user/:userSubreddit/comments/:threadID/:urlTitle' page_type='thread' component={Thread} />
              <DefaultLayout path='/user/:userSubreddit/comments/:threadID' page_type='thread' component={Thread} />
              <DefaultLayout path='/user/:user/:kind' page_type='user' component={User} />
              <DefaultLayout path='/user/:user' page_type='user' component={User} />
              <DefaultLayout path='/user/' page_type='blank_user' component={BlankUser} />
              <DefaultLayout path='/:threadID' page_type='thread' component={Thread} />
              <DefaultLayout component={NotFound} />
            </Switch>
          </BrowserRouter>
        </Provider>
      </ApolloProvider>
    )
  }
}
ReactDOM.render(<App />, document.getElementById('app'))
