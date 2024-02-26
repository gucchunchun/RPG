async function fetchJsonData(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error('Could not fetch gameData.json');
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export { fetchJsonData };

