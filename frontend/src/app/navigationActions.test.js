import { createNavigationActions } from './navigationActions';

function makeSetters() {
  return {
    setIsProfileMenuOpen: jest.fn(),
    setActiveNav: jest.fn(),
    handleOpenNewEssayForm: jest.fn(),
    setShowForm: jest.fn(),
    setShowApplicationForm: jest.fn(),
    setEditingApplicationId: jest.fn(),
    setSelectedEssay: jest.fn(),
    setReview: jest.fn(),
    setShowVersions: jest.fn(),
    setDocsApplicationId: jest.fn(),
    setExpandedNavGroups: jest.fn(),
    setSelectedApplicationId: jest.fn(),
    setApplicationSearch: jest.fn()
  };
}

describe('navigationActions', () => {
  test('essays route resets editor panels without opening composer', () => {
    const setters = makeSetters();
    const actions = createNavigationActions({
      ...setters,
      selectedApplicationId: 'app-1',
      applications: [],
      globalSearch: ''
    });

    actions.handleNavChange('essays');

    expect(setters.setActiveNav).toHaveBeenCalledWith('essays');
    expect(setters.handleOpenNewEssayForm).not.toHaveBeenCalled();
    expect(setters.setShowForm).toHaveBeenCalledWith(false);
    expect(setters.setShowApplicationForm).toHaveBeenCalledWith(false);
    expect(setters.setEditingApplicationId).toHaveBeenCalledWith(null);
    expect(setters.setSelectedEssay).toHaveBeenCalledWith(null);
    expect(setters.setReview).toHaveBeenCalledWith(null);
    expect(setters.setShowVersions).toHaveBeenCalledWith(false);
  });

  test('compose route opens new essay form', () => {
    const setters = makeSetters();
    const actions = createNavigationActions({
      ...setters,
      selectedApplicationId: null,
      applications: [],
      globalSearch: ''
    });

    actions.handleNavChange('compose');

    expect(setters.setActiveNav).toHaveBeenCalledWith('compose');
    expect(setters.handleOpenNewEssayForm).toHaveBeenCalledTimes(1);
  });
});
