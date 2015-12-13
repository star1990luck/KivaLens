'use strict';

//PAGES
import Search from './Search.jsx';
import Criteria from './Criteria.jsx'
import Loan from './Loan.jsx';
import Basket from './Basket.jsx';
import Options from './Options.jsx';
import About from './About.jsx';
import NotFound from './NotFound.jsx';
import ClearBasket from './ClearBasket.jsx'


//SIMPLE STATE-LESS COMPONENTS
import React from 'react'
const NewTabLink = ({href, title, children}) => <a href={href} title={title || 'Open link in new tab'} target="_blank">{children}</a>
const KivaLink = ({path, title, children}) => <NewTabLink href={`http://www.kiva.org/${path}`} title={title || 'Open page on www.kiva.org in new tab'}>{children}</NewTabLink>
const LenderLink = ({lender, title, children}) => <KivaLink path={`lender/${lender}?super_graphs=1`} title={title || "View Lender's page in a new tab"}>{children}</KivaLink>
const LoanLink = ({id, title, children}) => <KivaLink path={`lend/${id}`} title={title || 'View Loan in a new tab'}>{children}</KivaLink>
const EmailLink = ({email, subject, body, title, children}) => {
    var params = []
    if (subject) params.push(`subject=${encodeURI(subject)}`)
    if (body) params.push(`body=${encodeURI(body)}`)
    return (<NewTabLink href={`mailto:${email? email: 'liquidmonkey@gmail.com'}?${params.join('&')}`} title={title || 'Open your default email program'}>{children}</NewTabLink>)
}

//COMPONENTS
import KLNav from './KLNav.jsx';
import KLFooter from './KLFooter.jsx';
import LoanListItem from './LoanListItem.jsx';
import BasketListItem from './BasketListItem.jsx'
import LoadingLoansModal from './LoadingLoansModal.jsx'
import BulkAddModal from './BulkAddModal.jsx'
import KivaImage from './KivaImage.jsx'
import ChartDistribution from './ChartDistribution.jsx'
import CriteriaTabs from './CriteriaTabs.jsx'
import RandomChild from './RandomChild.jsx'
import CycleChild from './CycleChild.jsx'
import PromptModal from './PromptModal.jsx'

//when mistakenly importing without {}'s around variable name. prevents obscure errors.
import CatchNoCurlies from './CatchNoCurlies.jsx';

export default CatchNoCurlies;

export {NewTabLink, KivaLink, LenderLink, LoanLink, EmailLink,
    Search, Loan, NotFound, About, Basket, Options, Criteria, KivaImage,
    KLNav, KLFooter, LoadingLoansModal, BulkAddModal, LoanListItem, BasketListItem,
    ChartDistribution, CriteriaTabs, ClearBasket, RandomChild, CycleChild, PromptModal}