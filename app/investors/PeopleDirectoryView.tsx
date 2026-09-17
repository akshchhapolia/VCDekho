import SiteHeader from '../components/SiteHeader';
import PeopleDirectoryBrowser, { type PeopleFilters, type PersonCard } from './PeopleDirectoryBrowser';

function jsonScript(obj: unknown) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export default function PeopleDirectoryPage({
  people,
  filters,
  total
}: {
  people: PersonCard[];
  filters: PeopleFilters;
  total: number;
}) {
  return (
    <>
      <div className="app-container">
        <SiteHeader pathname="/investors" />
        <PeopleDirectoryBrowser people={people} filters={filters} indexUrl="/dir-index/people.json" />
      </div>
      <script
        type="application/json"
        id="ppl-prerender"
        dangerouslySetInnerHTML={{ __html: jsonScript({ total, filters, prerendered: true }) }}
      />
    </>
  );
}
