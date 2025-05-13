// Rewrite/client/src/components/Admin/TreeNode.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaTrashAlt, FaExclamationCircle, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { format } from 'date-fns';
import LoadingSpinner from '../../components/Common/LoadingSpinner'; // For delete operation

const TreeNode = ({ node, onContentDeleted, level }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first few levels
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState(null);
  const { apiClient } = useAuth();

  const hasChildren = node.childrenNodes && node.childrenNodes.length > 0;

  const handleDelete = async (e) => {
    e.stopPropagation(); // Prevent toggling expansion if clicking delete on the li
    if (!window.confirm(`Are you sure you want to delete this content and ALL its replies? This action is PERMANENT.`)) {
      return;
    }
    setLoadingDelete(true);
    setError(null);
    try {
      // Admin delete endpoint
      await apiClient.delete(`/content/admin/${node.id}`);
      if (onContentDeleted) {
        onContentDeleted(node.id); // Notify parent to update the tree
      }
      // No need to setLoadingDelete(false) if the component unmounts or parent re-renders fully
    } catch (err) {
      console.error("Failed to delete content (admin):", err);
      setError(err.response?.data?.error || "Failed to delete content.");
      setLoadingDelete(false);
    }
  };

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const textPreview = node.text.length > 150 ? node.text.substring(0, 150) + '...' : node.text;

  return (
    <li style={{ marginLeft: `${level * 20}px` }} className={`tree-node-level-${level}`}>
      <div
        onClick={toggleExpand}
        style={{ cursor: hasChildren ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}
        className="tree-node-header"
      >
        {hasChildren && (isExpanded ? <FaChevronDown size="0.8em" style={{marginRight: '5px'}}/> : <FaChevronRight size="0.8em" style={{marginRight: '5px'}}/>)}
        {!hasChildren && <span style={{display: 'inline-block', width: '1.2em'}}></span> /* Placeholder for alignment */}

        <strong className="tree-node-title">{node.title || 'Reply'}</strong>
        {node.isReported && (
          <FaExclamationCircle color="red" title="Reported Content" style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
        )}
      </div>
      <div className="tree-node-details" style={{ paddingLeft: '20px', borderLeft: '1px dashed #ccc', marginLeft: '6px' /* approx half of chevron width */ }}>
        <p className="tree-node-text" style={{fontStyle: 'italic', color: '#555', fontSize: '0.9em', margin: '5px 0'}}>{textPreview}</p>
        <small className="tree-node-meta">
          ID: {node.id} | By: {node.author?.username || 'Unknown'} |{' '}
          Likes: {node.likeCount} | Reports: {node.reports?.length || 0} |{' '}
          Created: {format(new Date(node.createdAt), 'MMM d, yyyy HH:mm')}
        </small>
        <div className="tree-node-actions" style={{marginTop: '5px'}}>
          <button onClick={handleDelete} className="btn btn-danger btn-sm" disabled={loadingDelete}>
            {loadingDelete ? <LoadingSpinner /> : <><FaTrashAlt /> Delete</>}
          </button>
          {error && <p className="error-message" style={{marginLeft: '10px', display: 'inline'}}>{error}</p>}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <ul>
          {node.childrenNodes.map(childNode => (
            <TreeNode
              key={childNode.id}
              node={childNode}
              onContentDeleted={onContentDeleted}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default TreeNode;
