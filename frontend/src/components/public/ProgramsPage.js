import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listProgramCatalogApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import './PublicPages.css';

const FALLBACK_PROGRAMS = [
  {
    id: 'fallback-1',
    school_name: 'INSEAD',
    program_name: 'MBA',
    degree: 'MBA',
    country: 'France/Singapore',
    city: 'Fontainebleau',
    application_fee: 250,
    fee_currency: 'EUR',
    deadline_round_1: null,
    source_url: ''
  },
  {
    id: 'fallback-2',
    school_name: 'Harvard Business School',
    program_name: 'MBA',
    degree: 'MBA',
    country: 'USA',
    city: 'Boston',
    application_fee: 250,
    fee_currency: 'USD',
    deadline_round_1: null,
    source_url: ''
  }
];

function formatFee(item) {
  if (item.application_fee === null || item.application_fee === undefined || item.application_fee === '') {
    return 'Fee not listed';
  }
  return `${item.fee_currency || 'USD'} ${item.application_fee}`;
}

export default function ProgramsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState('');

  const fetchPrograms = React.useCallback(async (nextQuery = '') => {
    try {
      setLoading(true);
      setError('');
      const response = await listProgramCatalogApi(nextQuery, 50);
      const nextItems = response?.items || [];
      setItems(nextItems);
      if (!nextItems.length) {
        setError('No matching programs found. Try a broader search.');
      }
    } catch (err) {
      setItems(FALLBACK_PROGRAMS);
      setError('Showing sample catalog while live source is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    document.body.classList.remove('dark-body');
    document.body.classList.add('public-body');
    return () => {
      document.body.classList.remove('public-body');
    };
    fetchPrograms('');
  }, [fetchPrograms]);

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchPrograms(query);
  };

  const handleUseProgram = () => {
    if (user) {
      navigate('/app');
      return;
    }
    navigate('/auth?mode=signup&next=%2Fapp');
  };

  return (
    <div className="public-page">
      <div className="public-shell">
        <header className="public-topbar">
          <div className="public-brand">Program Explorer</div>
          <nav className="public-nav" aria-label="Program nav">
            <Link className="public-link-btn" to="/">Back to Home</Link>
            <Link className="public-link-btn primary" to="/auth?mode=signup&next=%2Fapp">Start Free</Link>
          </nav>
        </header>

        <section className="public-section">
          <h1 className="public-section-title">Browse schools and program data</h1>
          <article className="public-card">
            <form className="public-program-toolbar" onSubmit={handleSubmit}>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by school, program, city, or country"
                aria-label="Search programs"
              />
              <button type="submit" className="public-btn primary" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {error && <p className="public-auth-next">{error}</p>}

            <div className="public-program-grid">
              {items.map((item) => (
                <article key={item.id || `${item.school_name}-${item.program_name}`} className="public-program-card">
                  <h3>{item.school_name || 'School'} - {item.program_name || 'Program'}</h3>
                  <div className="public-program-meta">
                    <span className="public-pill">{item.degree || 'Degree'}</span>
                    <span>{item.country || 'Country not listed'}</span>
                    <span>{item.city || 'City not listed'}</span>
                  </div>
                  <div className="public-program-meta">
                    <span>{formatFee(item)}</span>
                    <span>{item.deadline_round_1 ? `R1: ${item.deadline_round_1}` : 'Deadline not listed'}</span>
                  </div>
                  <div className="public-hero-actions">
                    <button type="button" className="public-btn secondary" onClick={handleUseProgram}>
                      Use in planner
                    </button>
                    {item.source_url ? (
                      <a className="public-link-btn" href={item.source_url} target="_blank" rel="noreferrer">
                        Source
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
