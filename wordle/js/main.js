const request = (url, params = {}, method = 'GET') => {
  let options = {
    method
  };
  if ('GET' === method) {
    url += '?' + (new URLSearchParams(params)).toString();
  } else {
    options.body = JSON.stringify(params);
  }

  return fetch(url, options);
};
const get = (url, params) => request(url, params, 'GET');

function getLocalStorageElement(key) {
  return localStorage.getItem(key);
}

function setLocalStorageElement(key, value) {
  localStorage.setItem(key, value);
}

function removeLocalStorageElement(key) {
  localStorage.removeItem(key);
}

function resetLocalStorage(prefix) {
  Object.keys(localStorage).forEach(function (key) {
    if (key.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  });
}
