const { getPersonBySlug, getPeopleByCompanySlug, toCard } = require('../../utils/people');
const { renderPersonPage } = require('../../utils/render-person-page');

module.exports = async function handler(req, res) {
  const { slug } = req.query || {};
  if (!slug) {
    return res.status(400).send('<h1>400 - Bad Request</h1>');
  }

  try {
    const person = getPersonBySlug(slug);
    if (!person) {
      return res.status(404).send('<h1>404 - Person Not Found</h1>');
    }

    const colleagues = getPeopleByCompanySlug(person.companySlug, person.slug).map(toCard);

    return renderPersonPage(person, colleagues, res);
  } catch (error) {
    console.error('person detail error:', error);
    res.status(500).send('<h1>500 - Internal Server Error</h1>');
  }
};
