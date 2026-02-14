#!/bin/bash

echo "🎨 Redesigning with beautiful pastel aesthetic..."
echo ""

cd frontend/src

# Create new modern App.css with pastel colors
cat > "App.css" << 'EOFCSS'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --color-bg: #E8F5F3;
  --color-card-bg: #FEFAF6;
  --color-sidebar: #FAF8F6;
  --color-primary: #FF9F9F;
  --color-secondary: #B8E6D5;
  --color-accent-purple: #C9B8E6;
  --color-accent-peach: #FFD4B8;
  --color-text-dark: #2D2D2D;
  --color-text-mid: #5A5A5A;
  --color-text-light: #8C8C8C;
  --color-border: #E8E8E8;
  --color-success: #7ED4BA;
  --color-warning: #FFB88C;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--color-bg);
  color: var(--color-text-dark);
}

.App {
  min-height: 100vh;
  display: flex;
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 1.5rem;
  color: var(--color-primary);
  background: var(--color-bg);
}

/* Sidebar Navigation */
.sidebar {
  width: 280px;
  background: var(--color-sidebar);
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border-right: 1px solid var(--color-border);
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
}

.sidebar-logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent-peach));
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.sidebar-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-dark);
}

.new-essay-btn {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent-peach));
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.new-essay-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.new-essay-btn:active {
  transform: translateY(0);
}

.essay-list h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-mid);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 1rem;
}

.essay-item {
  padding: 1rem;
  background: white;
  border-radius: var(--radius-md);
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: var(--shadow-sm);
}

.essay-item:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.essay-item.selected {
  background: linear-gradient(135deg, #FFF5F5, #FFF9F5);
  border-color: var(--color-primary);
}

.essay-item strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-dark);
  font-size: 0.95rem;
  font-weight: 600;
}

.essay-item .program-type {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--color-secondary);
  color: var(--color-text-dark);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.essay-meta-small {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.score-badge {
  background: var(--color-success);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.essay-item small {
  display: block;
  color: var(--color-text-light);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.empty-state {
  text-align: center;
  color: var(--color-text-light);
  padding: 2rem 1rem;
  font-size: 0.9rem;
}

/* Main Content Area */
.main-content {
  flex: 1;
  background: var(--color-card-bg);
  overflow-y: auto;
  height: 100vh;
}

.content-header {
  padding: 2rem;
  background: white;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(10px);
}

.header-left h1 {
  font-size: 1.75rem;
  color: var(--color-text-dark);
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.header-subtitle {
  color: var(--color-text-mid);
  font-size: 0.95rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent-purple), var(--color-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.user-name {
  font-size: 0.95rem;
  color: var(--color-text-dark);
  font-weight: 500;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-mid);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.logout-btn:hover {
  background: var(--color-sidebar);
  border-color: var(--color-text-mid);
}

/* Essay Detail View */
.essay-detail {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.essay-header {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.essay-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.essay-title-section h2 {
  font-size: 1.5rem;
  color: var(--color-text-dark);
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.version-badge {
  display: inline-block;
  background: var(--color-accent-purple);
  color: white;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.essay-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.review-btn,
.view-toggle-btn,
.version-btn,
.history-btn,
.delete-btn {
  padding: 0.65rem 1.25rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.review-btn {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent-peach));
  color: white;
}

.review-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.review-btn:disabled {
  background: var(--color-border);
  cursor: not-allowed;
  transform: none;
}

.view-toggle-btn {
  background: var(--color-secondary);
  color: var(--color-text-dark);
}

.view-toggle-btn:hover {
  background: #A0D9C5;
  transform: translateY(-2px);
}

.version-btn {
  background: var(--color-accent-peach);
  color: var(--color-text-dark);
}

.version-btn:hover {
  background: #FFCAA0;
  transform: translateY(-2px);
}

.history-btn {
  background: var(--color-accent-purple);
  color: white;
}

.history-btn:hover {
  background: #B5A0DB;
  transform: translateY(-2px);
}

.delete-btn {
  background: #FFB4B4;
  color: var(--color-text-dark);
}

.delete-btn:hover {
  background: #FF9999;
  transform: translateY(-2px);
}

.essay-meta {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.9rem;
  color: var(--color-text-mid);
}

/* Essay Content Cards */
.essay-section {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.essay-section h3 {
  font-size: 1.1rem;
  color: var(--color-text-dark);
  margin-bottom: 1rem;
  font-weight: 600;
}

.essay-section p {
  line-height: 1.8;
  color: var(--color-text-mid);
}

.essay-text {
  white-space: pre-wrap;
  background: var(--color-sidebar);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-secondary);
  line-height: 1.9;
  font-size: 1rem;
}

.review-section {
  background: linear-gradient(135deg, #FFF5F8, #FFF9F5);
  padding: 2rem;
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-primary);
  margin-top: 2rem;
  box-shadow: var(--shadow-md);
}

.review-section h3 {
  color: var(--color-primary);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 1.2rem;
}

.score {
  background: var(--color-success);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.review-content {
  white-space: pre-wrap;
  line-height: 1.9;
  color: var(--color-text-dark);
  font-size: 1rem;
}

/* Version History */
.versions-panel {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.versions-panel h3 {
  margin-bottom: 1.5rem;
  color: var(--color-text-dark);
  font-size: 1.1rem;
}

.versions-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.version-item {
  background: var(--color-sidebar);
  padding: 1.25rem;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.version-item:hover {
  border-color: var(--color-secondary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.version-item.current {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, #FFF5F5, #FFF9F5);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.version-header strong {
  color: var(--color-text-dark);
  font-size: 0.95rem;
}

.latest-badge {
  background: var(--color-success);
  color: white;
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.version-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.version-score {
  background: var(--color-success);
  color: white;
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.8rem;
}

/* Empty States */
.empty-state-main {
  text-align: center;
  padding: 6rem 2rem;
  color: var(--color-text-mid);
}

.empty-state-main h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--color-text-dark);
  font-weight: 600;
}

.empty-state-main p {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

/* Form Styles */
.essay-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.essay-form h2 {
  font-size: 1.75rem;
  margin-bottom: 2rem;
  color: var(--color-text-dark);
  font-weight: 600;
}

.version-notice {
  background: linear-gradient(135deg, var(--color-accent-purple), #D5C9F0);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: var(--radius-md);
  margin-bottom: 2rem;
  font-size: 0.95rem;
  font-weight: 500;
}

.form-group {
  margin-bottom: 1.75rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--color-text-dark);
  font-weight: 600;
  font-size: 0.95rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s ease;
  background: white;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 159, 159, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.form-actions button {
  padding: 1rem 2rem;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.form-actions button[type="submit"] {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent-peach));
  color: white;
  flex: 1;
}

.form-actions button[type="submit"]:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.form-actions button[type="submit"]:disabled {
  background: var(--color-border);
  cursor: not-allowed;
  transform: none;
}

.form-actions button[type="button"] {
  background: white;
  color: var(--color-text-mid);
  border: 2px solid var(--color-border);
}

.form-actions button[type="button"]:hover {
  background: var(--color-sidebar);
  border-color: var(--color-text-mid);
}

/* Side-by-Side View */
.main-content.side-by-side-view {
  padding: 0;
}

.side-by-side-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100vh;
  gap: 0;
}

.essay-column,
.review-column {
  padding: 2rem;
  overflow-y: auto;
}

.essay-column {
  border-right: 2px solid var(--color-border);
  background: white;
}

.review-column {
  background: linear-gradient(135deg, #FFF5F8, #FFF9F5);
}

.essay-column h3,
.review-column h3 {
  position: sticky;
  top: 0;
  background: inherit;
  padding: 1rem 0;
  margin: -1rem 0 1.5rem 0;
  z-index: 10;
  border-bottom: 2px solid var(--color-border);
  font-size: 1.2rem;
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .side-by-side-container {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .essay-column {
    border-right: none;
    border-bottom: 2px solid var(--color-border);
  }
}

@media (max-width: 768px) {
  .App {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
  
  .essay-actions {
    flex-direction: column;
  }
  
  .essay-actions button {
    width: 100%;
  }
  
  .content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

/* Smooth Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.essay-item,
.essay-section,
.version-item {
  animation: fadeIn 0.3s ease;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-sidebar);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-light);
}
EOFCSS

echo "✅ Created beautiful new design!"
echo ""
echo "The app should auto-reload with the new look."
echo "Refresh your browser if it doesn't!"
echo ""
