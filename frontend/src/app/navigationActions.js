export function createNavigationActions({
  setIsProfileMenuOpen,
  setActiveNav,
  handleOpenNewEssayForm,
  setShowForm,
  setShowApplicationForm,
  setEditingApplicationId,
  setSelectedEssay,
  setReview,
  setShowVersions,
  setDocsApplicationId,
  selectedApplicationId,
  setExpandedNavGroups,
  setSelectedApplicationId,
  applications,
  setApplicationSearch,
  globalSearch
}) {
  const resetEditorPanels = () => {
    setShowForm(false);
    setShowApplicationForm(false);
    setEditingApplicationId(null);
    setSelectedEssay(null);
    setReview(null);
    setShowVersions(false);
  };

  const handleNavChange = (section) => {
    setIsProfileMenuOpen(false);
    setActiveNav(section);

    if (section === 'compose') {
      handleOpenNewEssayForm();
      return;
    }

    if (section === 'tracker') {
      setShowForm(false);
      setSelectedEssay(null);
      setReview(null);
      setShowVersions(false);
      return;
    }

    if (section === 'essays') {
      setShowForm(false);
      setShowApplicationForm(false);
      setEditingApplicationId(null);
      setSelectedEssay(null);
      setReview(null);
      setShowVersions(false);
      return;
    }

    if (
      section === 'deadlines' ||
      section === 'requirements' ||
      section === 'docs' ||
      section === 'notifications' ||
      section === 'matrix' ||
      section === 'interviews' ||
      section === 'research' ||
      section === 'share'
      || section === 'admin'
    ) {
      if (section === 'docs' && selectedApplicationId) {
        setDocsApplicationId(selectedApplicationId);
      }
      resetEditorPanels();
      return;
    }

    if (section === 'home') {
      setShowApplicationForm(false);
      setEditingApplicationId(null);
      setShowForm(false);
      return;
    }

    if (section === 'settings' || section === 'profile') {
      resetEditorPanels();
    }
  };

  const handleToggleNavGroup = (groupId) => {
    setExpandedNavGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleViewAllApplications = () => {
    setSelectedApplicationId(null);
    setDocsApplicationId(null);
    setSelectedEssay(null);
    setShowForm(false);
    setShowApplicationForm(false);
    setActiveNav('tracker');
  };

  const handleSelectSidebarApplication = (applicationId) => {
    setSelectedApplicationId(applicationId);
    setDocsApplicationId(applicationId);
    setSelectedEssay(null);
    setReview(null);
    setShowVersions(false);
    setShowForm(false);
    setShowApplicationForm(false);
    setEditingApplicationId(null);
    setActiveNav('home');
  };

  const handleGlobalSearch = (e) => {
    if (e) e.preventDefault();
    const query = globalSearch.trim().toLowerCase();
    setApplicationSearch(globalSearch.trim());
    resetEditorPanels();

    if (!query) {
      setActiveNav('tracker');
      return;
    }

    const matchedApplication = applications.find(
      (application) =>
        (application.school_name || '').toLowerCase().includes(query) ||
        (application.program_name || '').toLowerCase().includes(query)
    );
    if (matchedApplication) {
      setSelectedApplicationId(matchedApplication.id);
      setDocsApplicationId(matchedApplication.id);
    } else {
      setSelectedApplicationId(null);
    }
    setActiveNav('tracker');
  };

  return {
    handleNavChange,
    handleToggleNavGroup,
    handleViewAllApplications,
    handleSelectSidebarApplication,
    handleGlobalSearch
  };
}
