import React from 'react'
import {Grid} from 'react-bootstrap'
import a from '../actions'

const Outdated = React.createClass({
    componentDidMount() {
        var url = decodeURIComponent(this.props.location.query.attempt)
        a.utils.var.set('outdatedUrl', url)
        location.href = '#/search'
    },
    render() {return (<Grid><h4>Outdated Link...</h4></Grid>)}
})

export default Outdated