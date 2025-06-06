// Rewrite/client/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// ArticleForm is no longer directly invoked here
// import ArticleForm from '../components/Content/ArticleForm';
import LoadingSpinner from '../components/Common/LoadingSpinner'; // Still used by feed components
import { FaFire, FaUsers, FaGlobeAmericas } from 'react-icons/fa'; // Removed FaPlusCircle

// Import Feed Components
import PopularFeed from '../components/Feed/PopularFeed';
import MyPageFeed from '../components/Feed/MyPageFeed';
import ExploreFeed from '../components/Feed/ExploreFeed';


const HomePage = () => {
  const { isAuthenticated } = useAuth(); // apiClient is used by child feed components via useAuth
  // showCreateForm state and related logic is removed as the button is removed
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const getDefaultTab = useCallback(() => {
      const queryTab = queryParams.get('tab');
      if (queryTab) {
          if (queryTab === 'myPage' && !isAuthenticated) return 'popular';
          if (queryTab === 'explore' && !isAuthenticated) return 'popular';
          return queryTab;
      }
      return isAuthenticated ? 'myPage' : 'popular';
  }, [isAuthenticated, queryParams]); // queryParams is stable if location.search is stable

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  useEffect(() => {
    const currentQueryTab = queryParams.get('tab');
    const defaultAuthTab = isAuthenticated ? 'myPage' : 'popular';
    let newActiveTab = activeTab;

    if (currentQueryTab) {
        if (currentQueryTab === 'myPage' && !isAuthenticated) {
            newActiveTab = 'popular';
        } else if (currentQueryTab === 'explore' && !isAuthenticated) {
            newActiveTab = 'popular';
        } else {
            // Validate if the tab from URL is valid
            const validTabs = ['myPage', 'popular', 'explore'];
             if ((isAuthenticated && validTabs.includes(currentQueryTab)) || 
                (!isAuthenticated && (currentQueryTab === 'popular'))) { // Only popular if not authenticated
                newActiveTab = currentQueryTab;
            } else {
                 newActiveTab = defaultAuthTab;
            }
        }
    } else {
        newActiveTab = defaultAuthTab;
    }

    if (newActiveTab !== activeTab) {
        setActiveTab(newActiveTab);
    }
    if (queryParams.get('tab') !== newActiveTab) {
        navigate(`/?tab=${newActiveTab}`, { replace: true });
    }

  }, [location.search, isAuthenticated, activeTab, navigate]);


  const handleTabChange = (tabName) => {
    navigate(`/?tab=${tabName}`, { replace: true });
    // setActiveTab will be updated by the useEffect listening to location.search
  };

  // handlePostSuccess is removed as the form is removed from this page

  const homeTabs = [];
  if (isAuthenticated) {
      homeTabs.push({ name: "My Page", key: "myPage", icon: <FaUsers />, description: "Articles from users you follow." });
  }
  homeTabs.push({ name: "Popular", key: "popular", icon: <FaFire />, description: "Most liked public articles." });
  if (isAuthenticated) {
      homeTabs.push({ name: "Explore", key: "explore", icon: <FaGlobeAmericas />, description: "Discover content from your extended network." });
  }


  return (
    <div>
      {/* Removed Welcome text and global action buttons */}

      {/* Sub-Header Tabs Navigation */}
      <nav className="home-subtabs-nav" style={{ marginTop:'1rem', marginBottom: '1.5rem', borderBottom: '2px solid #007bff', paddingBottom: '0px' }}>
        <ul style={{ display: 'flex', justifyContent: 'flex-start', listStyle: 'none', padding: '0', gap: '0px', flexWrap:'nowrap', overflowX:'auto' }}>
          {homeTabs.map(tabInfo => (
            <li key={tabInfo.key} style={{marginRight:'2px'}}>
            <button
                onClick={() => handleTabChange(tabInfo.key)}
                className={`btn ${activeTab === tabInfo.key ? 'btn-primary' : 'btn-light'}`}
                style={{
                    padding: '10px 18px',
                    fontSize: '1rem',
                    borderBottomLeftRadius: activeTab === tabInfo.key ? '0' : '4px',
                    borderBottomRightRadius: activeTab === tabInfo.key ? '0' : '4px',
                    borderBottom: activeTab === tabInfo.key ? '2px solid transparent' : '2px solid transparent',
                    marginBottom: activeTab === tabInfo.key ? '-2px' : '0',
                    position: 'relative',
                    fontWeight: activeTab === tabInfo.key ? '600' : 'normal',
                }}
                title={tabInfo.description || tabInfo.name}
            >
                {tabInfo.icon && React.cloneElement(tabInfo.icon, { style: { marginRight: '8px', verticalAlign:'middle' }})}
                {tabInfo.name}
            </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content for the selected tab */}
      <div className="home-tab-content" style={{paddingTop:'1rem'}}>
        {activeTab === 'myPage' && isAuthenticated && <MyPageFeed />}
        {activeTab === 'popular' && <PopularFeed />}
        {activeTab === 'explore' && isAuthenticated && <ExploreFeed />}
        
        {activeTab === 'myPage' && !isAuthenticated && 
            <div className="text-center p-3 card"><p>Please <Link to="/login">log in</Link> to see your personalized 'My Page' feed.</p></div>}
        {activeTab === 'explore' && !isAuthenticated && 
            <div className="text-center p-3 card"><p>Please <Link to="/login">log in</Link> to access the 'Explore' feed.</p></div>}
      </div>
    </div>
  );
};

export default HomePage;
