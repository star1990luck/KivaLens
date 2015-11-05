'use strict';

import React from 'react'
import Reflux from 'reflux'
import {Grid,Row,Col,Input,ButtonGroup,Button,Modal,ProgressBar,Panel,Alert} from 'react-bootstrap';
import {BasketListItem} from '.';
import a from '../actions'
import s from '../stores'
import InfiniteList from 'react-infinite-list'

const Basket = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState() {
        return $.extend(true, this.generateState(), {showGoodbye: false, refreshing: false})
    },
    componentDidMount(){
        this.listenTo(a.loans.load.completed,()=>{ this.setState(this.generateState()) })
        this.listenTo(a.loans.basket.changed,()=>{ this.setState(this.generateState()) })
        this.listenTo(a.loans.basket.select, id => this.setState({selected_item_id: id}))
        if (kivaloans.isReady()) this.refresh()
    },
    generateState(){
        var basket_items = s.loans.syncGetBasket()
        return {
            basket_count: basket_items.length,
            basket_items: basket_items,
            loans: basket_items.select(bi => bi.loan),
            amount_sum: basket_items.sum(bi => bi.amount),
            raw_basket_count: s.loans.syncBasketCount()
        }
    },
    makeBasket: function(){
        return JSON.stringify(this.state.basket_items.select(bi => {return {"id": bi.loan.id, "amount": bi.amount}}))
    },
    remove(e) {
        e.preventDefault()
        a.loans.basket.remove(this.state.selected_item_id)
        this.setState({selected_item_id: null})
    },
    clear(e){
        e.preventDefault()
        a.loans.basket.clear()
        this.setState({selected_item_id: null})
    },
    showGoodbye(){
        if (this.state.basket_count > 0) {
            window.rga.modalview('/baskettransfer');
            window.rga.event({category: 'basket', action: 'basket:transfer', value: this.state.basket_count})
            this.setState({showGoodbye: true})
        }
    },
    refresh(){
        this.setState({refreshing: true})
        s.loans.syncRefreshBasket().always(()=> this.setState({refreshing: false}))
    },
    render() {
        var style = {height:'100%', width: '100%'};
        return (
            <div style={style}>
                <Col md={4}>
                    <ButtonGroup justified>
                        <Button href="#" key={1} disabled={this.state.basket_count == 0} onClick={this.clear}>Empty Basket</Button>
                        <Button href="#" key={3} disabled={!this.state.selected_item_id} onClick={this.remove}>Remove Selected</Button>
                    </ButtonGroup>
                    <InfiniteList
                        className="loan_list_container"
                        items={this.state.basket_items}
                        height={600}
                        itemHeight={100}
                        listItemClass={BasketListItem} />
                </Col>
                <Col md={8}>
                    <Panel>
                        <h1>Basket: {this.state.basket_count} loans ${this.state.amount_sum}</h1>
                        <form method="POST" onSubmit={this.showGoodbye} action="http://www.kiva.org/basket/set">
                            <p>Note: Checking out will replace your current basket on Kiva.</p>
                            <input name="callback_url" value={`${location.protocol}//${location.host}${location.pathname}#clear-basket`} type="hidden" />
                            <input name="loans" value={this.makeBasket()} type="hidden" ref="basket_array" />
                            <input name="donation" value="0.00" type="hidden" />
                            <input name="app_id" value="org.kiva.kivalens" type="hidden" />
                            <input type="submit" disabled={this.state.basket_count == 0} className="btn btn-primary" value="Checkout at Kiva"/>
                        </form>
                    </Panel>
                    <If condition={this.state.refreshing}>
                        <Alert bsStyle="info">
                            Loans in your basket are being refreshed to get the latest funded and basket amounts from Kiva.
                        </Alert>
                    </If>
                </Col>
                <div className="static-modal">
                    <Modal show={this.state.showGoodbye} onHide={()=>{}}>
                        <Modal.Header>
                            <Modal.Title>Transferring Basket to Kiva</Modal.Title>
                        </Modal.Header>

                        <Modal.Body>
                            <p>
                                Depending upon the number of loans in your basket, transferring your selection to Kiva
                                could take some time... Please wait.
                            </p>
                            <If condition={this.state.amount_sum > 500}>
                                <p>
                                    Do you find KivaLens useful and want to offset server and development costs{'?'} You
                                    can <a href="http://www.kiva.org/gifts/kiva-cards?handle=nuclearspike#/lender" target="_blank">send a Kiva Gift Card</a>.
                                    (opens in a new window)
                                </p>
                            </If>
                        </Modal.Body>

                        <Modal.Footer>
                            <ProgressBar active now={100} />
                        </Modal.Footer>
                    </Modal>
                </div>
            </div>
        );
    }
})

export default Basket