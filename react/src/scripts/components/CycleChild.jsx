import React from 'react';

const CycleChild = React.createClass({
    getInitialState: function(){
        return {index: 0}
    },
    componentDidMount: function(){
        var index
        index = parseInt(localStorage.getItem(this.props.name))
        if (isNaN(index)) index = -1
        index++
        index = index % this.props.children.length
        localStorage.setItem(this.props.name, index)
        if (index == undefined) //if browser doesn't have localStorage
            Math.floor(Math.random() * (this.props.children.length - 1))
        this.setState({index: index})
    },
    render: function () {
        return (<span>{this.props.children[this.state.index]}</span>)
    }
})

export default CycleChild