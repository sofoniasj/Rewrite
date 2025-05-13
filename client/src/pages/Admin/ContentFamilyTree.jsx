// Rewrite/client/src/components/Admin/ContentFamilyTree.jsx
import React, { useMemo } from 'react';
import TreeNode from './TreeNode'; // We'll create this next

const ContentFamilyTree = ({ allContentItems, onContentDeleted }) => {
  // Helper function to build the tree structure from a flat list
  const buildTree = (list) => {
    if (!list || list.length === 0) return [];

    const map = {};
    const roots = [];

    // First pass: create a map of all nodes and initialize children arrays
    list.forEach(item => {
      map[item.id] = { ...item, childrenNodes: [] };
    });

    // Second pass: link children to their parents
    list.forEach(item => {
      if (item.parentContent && map[item.parentContent]) {
        // Check if child is already added (can happen if list is not perfectly sorted or has duplicates)
        if (!map[item.parentContent].childrenNodes.find(child => child.id === item.id)) {
            map[item.parentContent].childrenNodes.push(map[item.id]);
        }
      } else if (!item.parentContent) {
        // If no parentContent, it's a root node
        // Check if root is already added
        if (!roots.find(root => root.id === item.id)) {
            roots.push(map[item.id]);
        }
      }
    });

    // Sort children for consistent display (e.g., by creation date)
    Object.values(map).forEach(node => {
        if (node.childrenNodes.length > 0) {
            node.childrenNodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
    });
    // Sort root nodes as well
    roots.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

    return roots;
  };

  // useMemo to prevent rebuilding the tree on every render unless allContentItems changes
  const treeData = useMemo(() => buildTree(allContentItems), [allContentItems]);

  if (!treeData || treeData.length === 0) {
    return <p className="text-center">No content structure to display.</p>;
  }

  return (
    <div className="content-tree card">
      <h2 style={{marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem'}}>Content Hierarchy</h2>
      <ul>
        {treeData.map(rootNode => (
          <TreeNode
            key={rootNode.id}
            node={rootNode}
            onContentDeleted={onContentDeleted}
            level={0} // Starting level for indentation
          />
        ))}
      </ul>
    </div>
  );
};

export default ContentFamilyTree;
