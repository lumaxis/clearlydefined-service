// Copyright (c) Microsoft Corporation and others. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { mergeDefinitions, setIfValue } = require('../../lib/utils')
const SPDX = require('../../lib/spdx')
const { get, uniq } = require('lodash')

class FOSSologySummarizer {
  constructor(options) {
    this.options = options
  }

  /**
   * Summarize the raw information related to the given coordinates.
   *
   * @param {EntitySpec} coordinates - The entity for which we are summarizing
   * @param {*} harvested - the set of raw tool ouptuts related to the idenified entity
   * @returns {Definition} - a summary of the given raw information
   */
  summarize(coordinates, harvested) {
    const result = {}
    // TODO currently definition merging does not union values (licenses, copyrights) at the file level.
    // That means the order here matters. Later merges overwrite earlier. So here we are explicitly taking
    // Nomos over Monk. The Copyright info should be orthogonal so order does not matter. In the future
    // we should resolve this merging problem but it's likely to be hard in general.
    this._summarizeMonk(result, harvested)
    this._summarizeNomos(result, harvested)
    this._summarizeCopyright(result, harvested)
    return result
  }

  _summarizeNomos(result, output) {
    const content = get(output, 'nomos.output.content')
    if (!content) return
    const files = content
      .split('\n')
      .map(file => {
        const path = get(/^File (.*?) contains/.exec(file), '[1]')
        let license = SPDX.normalize(get(/license\(s\) (.*?)$/.exec(file), '[1]'))
        if (path && license) return { path, license }
        if (path) return { path }
      })
      .filter(e => e)
    mergeDefinitions(result, { files })
  }

  _summarizeMonk(result, output) {
    const content = get(output, 'monk.output.content')
    if (!content) return
    const files = content
      .split('\n')
      .map(file => {
        // only pickup full matches
        const [, path, rawLicense] = /^found full match between \\"(.*?)\\" and \\"(.*?)\\"/.exec(file)
        const license = SPDX.normalize(rawLicense)
        if (path && license) return { path, license }
        return { path }
      })
      .filter(e => e)
    mergeDefinitions(result, { files })
  }

  _summarizeCopyright(result, output) {
    const content = get(output, 'copyright.output.content')
    if (!content) return
    const files = content
      .map(entry => {
        const { path, output } = entry
        if (!output.results) return null
        const attributions = uniq(
          output.results
            .filter(result => result.type === 'statement')
            .map(result => result.content)
            .filter(e => e)
        )
        const file = { path }
        setIfValue(file, 'attributions', attributions)
        return file
      })
      .filter(e => e)
    mergeDefinitions(result, { files })
  }
}

module.exports = options => new FOSSologySummarizer(options)
