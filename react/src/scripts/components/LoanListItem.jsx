'use strict'

import React from 'react'
import Reflux from 'reflux'
import {ListGroupItem} from 'react-bootstrap'
import {KivaImage} from '.'
import cx from 'classnames'
import a from '../actions'
import s from '../stores/'

const LoanListItem = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState() {
        return { inBasket: s.loans.syncInBasket(this.props.id) }
    },
    componentDidMount() {
        this.listenTo(a.loans.basket.changed, ()=>{ this.setState({inBasket: s.loans.syncInBasket(this.props.id)}) })
        this.listenTo(a.loans.live.funded, loan => {if (loan.id == this.props.id) this.loanUpdated(loan)})
        this.loanUpdated(this.props)
    },
    loanUpdated(loan){
        if (loan.status == 'funded') this.setState({funded: true})
    },
    render() {
        var loan = this.props
        return (
            <ListGroupItem
                className={cx('loan_list_item', {in_basket: this.state.inBasket, funded: this.state.funded})}
                key={loan.id}
                href={`#/search/loan/${loan.id}`}>
                <KivaImage className="float_left" type="square" loan={loan} image_width={113} height={90} width={90}/>
                <div className="details">
                    <p><b>{loan.name}</b></p>
                    {loan.location.country} | {loan.sector} <span className="hidden-md">| {loan.activity}</span>
                    <p className="hidden-md">
                    {loan.use}
                    </p>
                </div>
            </ListGroupItem>
        )
    }
})

export default LoanListItem;