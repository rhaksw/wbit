import React from 'react'
import { connect } from 'state'
import { Selection } from './SelectionBase'
import { ExcludeLabel } from './RemovedByFilter'

export const IS_OP = 'is_op'
export const MOD = 'mod'
export const QUARANTINE = 'quarantine'
export const ADMIN = 'admin'
export const NONE = 'none'
export const STICKIED = 'stickied'

export const TAG_META = {[IS_OP]: {
                          field: 'is_op',
                          values: [true],
                          text: 'OP'},
                         [MOD]: {
                           field: 'distinguished',
                           values: ['moderator'],
                           text: 'moderator'},
                         [ADMIN]: {
                           field: 'distinguished',
                           values: ['admin','special'],
                           text: 'admin/special'},
                         [QUARANTINE]: {
                           field: 'quarantine',
                           values: [true],
                           text: 'quarantined'},
                         [STICKIED]: {
                           field: 'stickied',
                           values: [true],
                           text: 'stickied'}
                         }

class TagsFilter extends React.Component {

  render() {
    const {page_type} = this.props
    const tagsFilter = this.props.global.state.tagsFilter
    const updateStateAndURL = this.props.global.tagsFilter_update
    return (
        <Selection className='tagsFilter' isFilter={true} isSet={Object.keys(tagsFilter).length !== 0} title='Tags'>
          {
            Object.keys(TAG_META).map(type => {
              if (page_type === 'thread' && type === QUARANTINE) {
                return null
              }
              return (
                <div key={type}>
                  <label title={TAG_META[type].text}>
                    <input id={type} type='checkbox'
                      checked={tagsFilter[type] !== undefined}
                      value={type}
                      onChange={(e) => updateStateAndURL(e.target, page_type)}
                    />
                    <span>{TAG_META[type].text}</span>
                  </label>
                </div>
              )
            })
          }
          <ExcludeLabel globalVarName='exclude_tag' page_type={page_type} />
        </Selection>
    )
  }
}

export default connect(TagsFilter)
