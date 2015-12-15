'use strict';

import React from 'react'
import {Grid,Input,Row,Col,Panel,Alert,Button} from 'react-bootstrap'
import LinkedStateMixin from 'react-addons-linked-state-mixin'
import LocalStorageMixin from 'react-localstorage'
import {KivaLink, NewTabLink, ClickLink, SetLenderIDModal} from '.'

const Options = React.createClass({
    mixins: [LinkedStateMixin, LocalStorageMixin],
    getInitialState(){ return { maxRepaymentTerms: 120, maxRepaymentTerms_on: false, missingPartners: [], showLenderModal: false } },
    componentDidMount(){
        this.setState({missingPartners: this.getMissingPartners()})
    },
    componentWillUnmount(){
        setDebugging()
        if (this.state.mergeAtheistList && !kivaloans.atheist_list_processed)
            kivaloans.getAtheistList()
    },
    showLenderIDModal(){
        this.setState({ showLenderModal: true })
    },
    hideLenderIDModal(){
        this.setState({ showLenderModal: false })
    },
    setLenderID(new_lender_id){
        this.setState({kiva_lender_id: new_lender_id})
    },
    getStateFilterKeys() {
        return ['maxRepaymentTerms', 'maxRepaymentTerms_on', 'kiva_lender_id', 'mergeAtheistList', 'debugging'];
    },
    getMissingPartners(){
        var m_partners = kivaloans.partners_from_kiva.where(p=>!p.atheistScore && p.status=='active')
        var m_p_with_loans = kivaloans.partner_ids_from_loans.intersect(m_partners.select(p=>p.id))
        cl("missingPartners",m_partners)
        return m_partners.select(p => $.extend(true, {}, p, {kl_hasLoans: m_p_with_loans.contains(p.id) }))
    },
    render() {
        return (
            <Grid>
                <h1>Options</h1>
                <Col md={12}>
                    <Panel header='Final Repayment Date'>
                        <Input
                            type="checkbox"
                            label={`Ignore loans with more than ${this.state.maxRepaymentTerms} months before final repayment (stop downloading)`}
                            checkedLink={this.linkState('maxRepaymentTerms_on')} />
                        <input
                            type="range"
                            min={8}
                            max={120}
                            valueLink={this.linkState('maxRepaymentTerms')}/>
                        This setting will only take effect the next time you return to the site. After the initial load,
                        if you keep the page open long enough, the rest of the loans will get loaded so you'll still
                        need to use the final repayment date criteria option.
                    </Panel>
                    <Panel header='Who are you?'>
                        <If condition={this.state.kiva_lender_id}>
                            <span>Your Lender ID: <b>{this.state.kiva_lender_id}</b> <ClickLink onClick={this.showLenderIDModal}>Change</ClickLink></span>
                        <Else/>
                            <Button onClick={this.showLenderIDModal}>Set Kiva Lender ID</Button>
                        </If>
                        <SetLenderIDModal show={this.state.showLenderModal} onSet={lenderId=>this.setLenderID(lenderId)} onHide={this.hideLenderIDModal}/>
                        <p className="ample-padding-top">
                            This is used to hide loans you've already loaned to and to automatically
                            prune your basket when you come back to KivaLens after making loan purchases.
                            It is also used for balancing your portfolio (see the "Portfolio Balancing" section on the
                            "Your Portfolio" criteria tab).
                        </p>
                    </Panel>
                    <Panel header='External Research'>
                        <Input
                            type="checkbox"
                            label={`Merge Atheist Team's MFI Research Data for Secular and Social ratings`}
                            checkedLink={this.linkState('mergeAtheistList')} />
                        <p>
                            KivaLens server pulls the <KivaLink path="team/atheists">Atheist Team</KivaLink>'s
                            MFI List from this <NewTabLink href="http://docs.google.com/spreadsheets/d/1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0/export?gid=1&format=csv" title="Download CSV">Google Doc</NewTabLink> once
                            a day and merges some of the data which allows you to search using their Secular (1-4)
                            and Social ratings (1-4) where a 1 represents a low score, so a 1 in the Secular Score
                            means that it is religion based. When activated, this will add 2 new sliders to the Partner
                            tab for Criteria and a section displaying and explaining the ratings to the Partner tab
                            of the loan. If a partner is not present in the MFI Research Data, it will pass by default.
                        </p>
                        <If condition={kivaloans.atheist_list_processed}>
                            <div><b>Partners not included in Atheist Data:</b>
                                <If condition={this.state.missingPartners.length==0}>
                                    <span> None</span>
                                </If>
                            <ul>
                                <For each='p' index='i' of={this.state.missingPartners}>
                                    <li key={i}>
                                        {p.id}: <KivaLink path={`partners/${p.id}`}>{p.name}</KivaLink>
                                        <If condition={p.kl_hasLoans}>
                                            <span> (Has loans loaded)</span>
                                        </If>
                                    </li>
                                </For>
                            </ul>
                            </div>
                        </If>
                    </Panel>
                    <Panel header='Debug'>
                        <Input
                            type="checkbox"
                            label="Output debugging console messages"
                            checkedLink={this.linkState('debugging')} />
                    </Panel>

                </Col>
            </Grid>
        )
    }
})

export default Options;