import React from 'react'
import { withRouter } from 'react-router'
import { connect } from 'state'
import { Query } from 'react-apollo'
import gql from 'graphql-tag'
import * as d3 from 'd3'
import CommentPreview from 'pages/common/CommentPreview'
import PostPreview from 'pages/common/PostPreview'
import { kFormatter } from 'utils'


class Sparkline extends React.PureComponent {
  constructor(props) {
    super(props);
    this.xScale = d3.scaleLinear();
    this.yScale = d3.scaleLinear();
    this.line = d3.line();
    this._updateDataTransforms(props);
  }
  componentDidMount() {
    const self = this;
    d3.select('svg')
    .on('mousemove', function() { self._onMouseMove(d3.mouse(this)[0]); })
    .on('click', function() { self._onMouseClick(d3.mouse(this)[0]); })
    .on('mouseleave', function() { self._onMouseMove(null); });
  }
  componentDidUpdate(newProps) {
    this._updateDataTransforms(newProps);
  }
  _updateDataTransforms(props) {
    const {xAccessor, yAccessor, width, height, data} = props;
    let len = data.length, min = Infinity, max = -Infinity
    while (len--) {
      const val = data[len].y.rate
      if (val < min) {
        min = val
      }
      if (val > max) {
        max = val
      }
    }
    this.xScale
      .domain([0, data.length])
      .range([0, width]);
    this.yScale
      .domain([min, max])
      .range([height, 0]);
    this.line
      .x((d, i) => this.xScale(xAccessor(d, i)))
      .y((d, i) => this.yScale(yAccessor(d, i)));
    this.bisectByX = d3.bisector(xAccessor).left;
  }
  _onMouseClick(xPixelPos) {
    const {data, onClick, xAccessor} = this.props;
    if (xPixelPos === null) {
      onClick(null, null);
    }
    else {
      const xValue = this.xScale.invert(xPixelPos);
      const i = this._findClosest(data, xValue, xAccessor);
      onClick(data[i], i);
    }
  }
  _onMouseMove(xPixelPos) {
    const {data, onHover, xAccessor} = this.props;
    if (xPixelPos === null) {
      onHover(null, null);
    }
    else {
      const xValue = this.xScale.invert(xPixelPos);
      const i = this._findClosest(data, xValue, xAccessor);
      onHover(data[i], i);
    }
  }
  _findClosest(array, value, accessor) {
    if (!array || !array.length) {
      return null;
    }

    const bisect = d3.bisector(accessor).right;
    const pointIndex = bisect(array, value);
    const left_i = pointIndex - 1
    const right_i = pointIndex
    const left = array[left_i], right = array[right_i];

    let i;

    // take the closer element
    if (left && right) {
      i = Math.abs(value - accessor(left)) < Math.abs(value - accessor(right)) ? left_i : right_i;
    } else if (left) {
      i = left_i;
    } else {
      i = right_i;
    }

    return i;
  }

  render() {
    const {data, width, height, xAccessor} = this.props
    let { hovered } = this.props
    const before_id = new URLSearchParams(window.location.search).get('before_id')
    if (before_id) {
      data.forEach(point => {
        if (point.y.last_id == before_id && ! hovered) {
          hovered = point
        }
      })
    }
    const hoveredRender = (hovered)
      ? (
        <line
          x1={this.xScale(xAccessor(hovered))}
          x2={this.xScale(xAccessor(hovered))}
          y0={0}
          y1={height}
          style={{strokeWidth: '2px', stroke: 'red', opacity: .65}}
        />
      )
      : null;
    return (
      <svg width={width} height={height} ref="svg">
        <path
          style={{fill: 'none', strokeWidth: '2px', stroke: '#828282'}}
          d={this.line(data)}
        />
        {hoveredRender}
      </svg>
    );
  }
}
Sparkline.defaultProps = {
  xAccessor: ({x}) => x,
  yAccessor: ({y}) => y.rate,
};



const numGraphPointsParamKey = 'rr_ngp'
const sortByParamKey = 'rr_sortby'
const contentTypeParamKey = 'rr_content'
const numGraphPointsDefault = 50
const sortByDefault = 'rate'
const contentTypeDefault = 'comments'
const componentParams = {[numGraphPointsParamKey]: numGraphPointsDefault,
                         [sortByParamKey]: sortByDefault,
                         [contentTypeParamKey]: contentTypeDefault}

class UpvoteRemovalRateHistory extends React.Component {
  state = {
    hovered: null,
    clicked: null,
    displayOptions: false,
    [numGraphPointsParamKey]: numGraphPointsDefault,
    [sortByParamKey]: sortByDefault,
    [contentTypeParamKey]: contentTypeDefault
  }
  toggleDisplayOptions = () => {
    this.setState({displayOptions: ! this.state.displayOptions})
  }
  getDisplayOptionsText() {
    if (this.state.displayOptions) {
      return '[–] options'
    } else {
      return '[+] options'
    }
  }

  componentDidMount() {
    const queryParams = new URLSearchParams(this.props.location.search)
    const stateUpdate = {}
    Object.keys(componentParams).forEach(param => {
      let paramVal = queryParams.get(param)
      if (paramVal) {
        stateUpdate[param] = paramVal
      }
    })
    this.setState(stateUpdate)
  }

  updateStateAndURL = (paramKey, value, defaultValue) => {
    this.setState({[paramKey]: value})
    const queryParams = new URLSearchParams(this.props.location.search)
    if (value !== defaultValue) {
      queryParams.set(paramKey, value)
    } else {
      queryParams.delete(paramKey)
    }
    let to = `${this.props.location.pathname}?${queryParams.toString()}`
    this.props.history.replace(to)
  }
  goToGraphURL = (last_created_utc, last_id, total_items) => {
    const subreddit = (this.props.match.params.subreddit || '').toLowerCase()
    const queryParams = new URLSearchParams()
    // constructing new queryParams, excluding any selections outside this component.
    //  also excluding component param if value is the default
    Object.keys(componentParams).forEach(param => {
      if (this.state[param] != componentParams[param]) {
        queryParams.set(param, this.state[param])
      }
    })
    let baseURL = `/r/${subreddit}`
    if (this.state[contentTypeParamKey] == 'comments') {
      baseURL += '/comments'
    }
    this.props.global.upvoteRemovalRateHistory_update(
      last_created_utc,
      last_id,
      total_items,
      this.state[contentTypeParamKey],
      queryParams,
      baseURL)
  }

  render() {
    const subreddit = this.props.match.params.subreddit.toLowerCase()
    const {page_type} = this.props
    const {clicked} = this.state
    let {hovered} = this.state
    let preview = ''
    let commentFunction = 'getcommentupvoteremovedratesbyrate'
    let postFunction = 'getpostupvoteremovedratesbyrate'
    if (this.state[sortByParamKey] === 'last_created_utc') {
      commentFunction = 'getcommentupvoteremovedratesbydate'
      postFunction = 'getpostupvoteremovedratesbydate'
    }

    return (
      <Query
        query={gql`
          {
            ${commentFunction}(args: {subreddit: "${subreddit}"},
                               limit: ${this.state[numGraphPointsParamKey]}) {
              body
              created_utc
              id_of_max_pos_removed_item
              last_created_utc
              last_id
              rate
              score
              subreddit
              title
              total_items
            }
            ${postFunction}(args: {subreddit: "${subreddit}"},
                           limit: ${this.state[numGraphPointsParamKey]}) {
              created_utc
              id_of_max_pos_removed_item
              last_created_utc
              last_id
              rate
              score
              subreddit
              title
              num_comments
              total_items
            }
          }
      `}
      >
        {({ loading, error, data }) => {
          if (loading) return <p>Loading...</p>;
          if (error) return <p>Error :(</p>;

          let selected_data = []
          if (this.state[contentTypeParamKey] === 'comments') {
            selected_data = data[commentFunction]
          } else {
            selected_data = data[postFunction]
          }
          selected_data = selected_data.sort((a,b) => a.last_created_utc - b.last_created_utc).map((y, x) => { return {x, y}; })
          const before_id = new URLSearchParams(window.location.search).get('before_id')
          if (! hovered && before_id) {
            selected_data.forEach(point => {
              if (point.y.last_id == before_id) {
                hovered = point
              }
            })
          }
          if (hovered) {
            if (this.state[contentTypeParamKey] === 'comments') {
              preview = <CommentPreview {...hovered.y}/>
            } else {
              preview = <PostPreview {...hovered.y}/>
            }
          }
          return (
            <div className='upvoteRemovalRate selection'>
              <div className='title' title='percentage upvotes removed over time'>Upvote Removal Rate</div>
              <div className='toggleOptions'><a onClick={this.toggleDisplayOptions}
                      className='collapseToggle'>
                      {this.getDisplayOptionsText()}</a>
              </div>
              {this.state.displayOptions &&
                <div className='options'>
                  <div className='filter-menu'>
                    <label className='filter-name' title="each graph point represents a period of either 1,000 comments or 1,000 posts">
                      size</label>
                    {
                      [10,50,500,1000].map(n => {
                        let displayValue = kFormatter(n)
                        return (
                          <label key={n}>
                            <input type='radio' value={n}
                                   checked={this.state[numGraphPointsParamKey] == n}
                                   onChange={(e) =>
                                       this.updateStateAndURL(numGraphPointsParamKey,
                                                              parseInt(e.target.value),
                                                              numGraphPointsDefault)}/>
                            <span>{displayValue}</span>
                          </label>
                        )
                      })
                    }
                  </div>
                  <div className='filter-menu'>
                    <label className='filter-name' title="sort order of database retrieval. results are resorted by date for graph display">
                      sort</label>
                    <label>
                      <input type='radio' value='rate' checked={this.state[sortByParamKey] == 'rate'}
                        onChange={(e) =>
                            this.updateStateAndURL(sortByParamKey,
                                                   e.target.value,
                                                   sortByDefault)}/>
                      <span>top</span>
                    </label>
                    <label>
                      <input type='radio' value='last_created_utc' checked={this.state[sortByParamKey] == 'last_created_utc'}
                        onChange={(e) =>
                            this.updateStateAndURL(sortByParamKey,
                                                   e.target.value,
                                                   sortByDefault)}/>
                      <span>new</span>
                    </label>
                  </div>
                  <div className='filter-menu'>
                    <label className='filter-name'>
                      type</label>
                    <label>
                      <input type='radio' value='comments' checked={this.state[contentTypeParamKey] == 'comments'}
                        onChange={(e) =>
                            this.updateStateAndURL(contentTypeParamKey,
                                                   e.target.value,
                                                   contentTypeDefault)}/>
                      <span>comments</span>
                    </label>
                    <label>
                      <input type='radio' value='posts' checked={this.state[contentTypeParamKey] == 'posts'}
                        onChange={(e) =>
                            this.updateStateAndURL(contentTypeParamKey,
                                                   e.target.value,
                                                   contentTypeDefault)}/>
                      <span>posts</span>
                    </label>
                  </div>
                </div>
              }
              <div className='graph'>
                <Sparkline
                  data={selected_data}
                  width={200}
                  height={50}
                  hovered={hovered}
                  onHover={(hovered, index) => this.setState({hovered})}
                  onClick={(clicked, index) => this.goToGraphURL(clicked.y.last_created_utc, clicked.y.last_id, clicked.y.total_items)}
                />
                <div>
                  {preview}
                </div>
              </div>
            </div>
          )
        }}
      </Query>

    )
  }
}

export default withRouter(connect(UpvoteRemovalRateHistory))