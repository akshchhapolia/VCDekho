import SiteHeader from '../components/SiteHeader';
import FundsDirectoryBrowser, { type FundCard, type FundFilters } from './FundsDirectoryBrowser';

function jsonScript(obj: unknown) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export default function FundsDirectoryView({
  investors,
  filters,
  total
}: {
  investors: FundCard[];
  filters: FundFilters;
  total: number;
}) {
  return (
    <>
      <div className="app-container">
        <SiteHeader pathname="/funds" />
        <FundsDirectoryBrowser investors={investors} filters={filters} indexUrl="/dir-index/funds.json" />
      </div>
      <script
        type="application/json"
        id="inv-prerender"
        dangerouslySetInnerHTML={{ __html: jsonScript({ total, filters, prerendered: true }) }}
      />
    </>
  );
}
