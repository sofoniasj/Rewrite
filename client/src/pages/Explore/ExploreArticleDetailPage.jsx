// Rewrite/client/src/pages/Explore/ExploreArticleDetailPage.jsx
import React, { useState, useEffect } from 'react'; // Removed useCallback as it's simpler now
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// Use the same enhanced ReadPageArticleView
import ReadPageArticleView from '../../components/Content/ReadPageArticleView';

const ExploreArticleDetailPage = () => {
  const { articleId } = useParams();
  const { apiClient } = useAuth(); // apiClient is used by ReadPageArticleView via useAuth
  const location = useLocation();

  // ReadPageArticleView now handles its own data fetching based on rootArticleId and location.state.initialPathIds
  // So, ExploreArticleDetailPage becomes simpler.

  const [rootArticleTitle, setRootArticleTitle] = useState('');
  const [loadingTitle, setLoadingTitle] = useState(true);

  useEffect(() => {
    if (articleId) {
      setLoadingTitle(true);
      apiClient.get(`/content/${articleId}?view=title_only`)
        .then(response => {
          setRootArticleTitle(response.data?.title || 'Explore Lineage');
        })
        .catch(() => setRootArticleTitle('Explore Lineage'))
        .finally(() => setLoadingTitle(false));
    }
  }, [articleId, apiClient]);

  return (
    <div>
      <nav aria-label="breadcrumb" style={{marginBottom: '1rem', paddingBottom:'0.5rem', borderBottom: '1px solid #eee'}}>
          <ol style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '5px', fontSize: '0.9rem', color: '#555' }}>
           {/* <li><Link to="/explore">Explore Articles</Link></li>*/}
            <li style={{color: '#888'}}>/</li>
            <li aria-current="page" style={{fontWeight: 600}}>
                {loadingTitle ? 'Loading title...' : rootArticleTitle}
            </li>
          </ol>
      </nav>

      <ReadPageArticleView
          key={`explore-${articleId}-${JSON.stringify(location.state?.initialPathIds || {})}`}
          rootArticleId={articleId}
          // initialLineage can be omitted
          // onLineageUpdate can be omitted if parent doesn't need direct updates
      />
    </div>
  );
};

export default ExploreArticleDetailPage;
