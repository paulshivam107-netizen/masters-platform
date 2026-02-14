export function createDocumentActions({
  getDocScopeKey,
  docsApplicationId,
  setDocStatusByApplication,
  docsCopySourceId,
  activeDocsApplicationId,
  docStatusByApplication,
  setInterviewPrepByApplication,
  getDefaultInterviewPrep,
  setResearchByApplication,
  getDefaultResearchCard
}) {
  const updateDocStatus = (docId, nextState, applicationId = docsApplicationId) => {
    const scopeKey = getDocScopeKey(applicationId);
    setDocStatusByApplication((prev) => ({
      ...prev,
      [scopeKey]: {
        ...(prev[scopeKey] || {}),
        [docId]: {
          ...((prev[scopeKey] || {})[docId] || {}),
          ...nextState,
          updated_at: new Date().toISOString()
        }
      }
    }));
  };

  const copyDocsFromApplication = () => {
    if (!docsCopySourceId || !activeDocsApplicationId) return;
    const sourceScope = getDocScopeKey(Number(docsCopySourceId));
    const targetScope = getDocScopeKey(activeDocsApplicationId);
    const sourceDocs = docStatusByApplication[sourceScope] || {};

    setDocStatusByApplication((prev) => ({
      ...prev,
      [targetScope]: { ...sourceDocs }
    }));
  };

  const updateInterviewPrepField = (applicationId, field, value) => {
    setInterviewPrepByApplication((prev) => ({
      ...prev,
      [applicationId]: {
        ...getDefaultInterviewPrep(),
        ...(prev[applicationId] || {}),
        [field]: value
      }
    }));
  };

  const updateResearchField = (applicationId, field, value) => {
    setResearchByApplication((prev) => ({
      ...prev,
      [applicationId]: {
        ...getDefaultResearchCard(),
        ...(prev[applicationId] || {}),
        [field]: value
      }
    }));
  };

  return {
    updateDocStatus,
    copyDocsFromApplication,
    updateInterviewPrepField,
    updateResearchField
  };
}
