const swiper = new Swiper('.swiper', {
    // Optional parameters
    direction: 'vertical',
    loop: true,
  
    // If we need pagination
    pagination: {
      el: '.swiper-pagination',
    },
  
    // Navigation arrows
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  
    // And if we need scrollbar
    scrollbar: {
      el: '.swiper-scrollbar',
    },
  });


swiper.on('slideChangeTransitionStart', async function () {
  let lastSlideIndex = swiper.previousIndex; // Index of slide that is currently active
  let lastSlide = swiper.slides[lastSlideIndex]; // Get the current slide
  let lastIframe = lastSlide.querySelector('.yt_player'); // Find the YouTube player in the current slide

  if (lastIframe) {
    lastIframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
  }

  let activeSlide = swiper.slides[swiper.activeIndex];
    let activeIframe = activeSlide.querySelector('.yt_player');
    if (activeIframe && activeIframe.contentWindow) {
        activeIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
  // start();
});

function loadClient() {
  gapi.client.setApiKey("AIzaSyDxXfbbJRF_Ntu9zReVK1bcZ7LNiOH-9K0");
  return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
      .then(function() { console.log("GAPI client loaded for API"); },
            function(err) { console.error("Error loading GAPI client for API", err); });
}
// Make sure the client is loaded and sign-in is complete before calling this method.
function execute() {
  return gapi.client.youtube.search.list({
    "part": [
      "snippet"
    ],
    "maxResults": 25,
    "q": "surfing"
  })
      .then(function(response) {
              // Handle the results here (response.result has the parsed body).
              console.log("Response", response);
            },
            function(err) { console.error("Execute error", err); });
}
const SpotifyAPI = (function() {
  const clientId = 'f15e198dba434061abcfae185f303592';
  const clientSecret = '41c7f09497da4b8a9291909b0e48e3ba';

  const _getToken = async () => {
    const result = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Authorization' : 'Basic ' + btoa(clientId + ':' + clientSecret)
      },
      body: 'grant_type=client_credentials'
    });

    const data = await result.json();
    return data.access_token;
  }
  const _getGenres = async (token) => {

    const result = await fetch(`https://api.spotify.com/v1/browse/categories?locale=sv_US&limit=10`, {
        method: 'GET',
        headers: { 'Authorization' : 'Bearer ' + token}
    });
    const data = await result.json();
    console.log(data);

    return data.categories.items;
  }
  const _getPlaylistByGenre = async (token, genreId) => {

    const limit = 10;
    
    const result = await fetch(`https://api.spotify.com/v1/browse/categories/${genreId}/playlists?limit=${limit}`, {
        method: 'GET',
        headers: { 'Authorization' : 'Bearer ' + token}
    });

    const data = await result.json();
    return data.playlists.items;
  }
  const _getTracks = async (token, tracksEndPoint) => {

    const limit = 10;

    const result = await fetch(`${tracksEndPoint}?limit=${limit}`, {
        method: 'GET',
        headers: { 'Authorization' : 'Bearer ' + token}
    });

    const data = await result.json();
    return data.items;
  }
  const _getTrack = async (token, trackEndPoint) => {

    const result = await fetch(`${trackEndPoint}`, {
        method: 'GET',
        headers: { 'Authorization' : 'Bearer ' + token}
    });

    const data = await result.json();
    return data;
  }

  return {
    getToken() {
        return _getToken();
    },
    getGenres(token) {
        return _getGenres(token);
    },
    getPlaylistByGenre(token, genreId) {
        return _getPlaylistByGenre(token, genreId);
    },
    getTracks(token, tracksEndPoint) {
        return _getTracks(token, tracksEndPoint);
    },
    getTrack(token, trackEndPoint) {
        return _getTrack(token, trackEndPoint);
    }
  }

})();

const cardLoader = async function(genreId, genreName){
  try {
    const token = await SpotifyAPI.getToken();
    const playlists = await SpotifyAPI.getPlaylistByGenre(token, genreId);
    // Assuming the first playlist is chosen
    const tracks = await SpotifyAPI.getTracks(token, playlists[0].tracks.href);
    // Randomly select a track
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
    const trackTitle = randomTrack.name;

    // Search for this track on YouTube
    await loadClient(); // Ensure YouTube API client is loaded
    const response = await gapi.client.youtube.search.list({
      part: "snippet",
      maxResults: 1,
      q: `${trackTitle} music video`
    });

    // Assume the first result is the desired video
    const videoId = response.result.items[0].id.videoId;
    const iframeUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;

    // Create and append the new swiper slide
    const swiperContainer = document.querySelector('#card-container');
    const newSlide = document.createElement('div');
    newSlide.classList.add('swiper-slide');
    newSlide.innerHTML = `<iframe class="yt_player" width="560" height="315" src="${iframeUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    swiperContainer.appendChild(newSlide);

    // Update Swiper
    swiper.update();
  } catch (error) {
    console.error('Error loading track and video:', error);
  }
};

const UILoader = (function() {
  const DomElements = {
    selectGenre: '#genre-head',
    hfToken: '#hidden_token',
    genresContainer: '#genres-container',
  }

  return {
    createGenre(text, value) {
      const button = document.createElement('button');
      if (text == "Topplistor") {
        button.textContent = "Top Lists";
      } else {
        button.textContent = text;
      }
      button.onclick = function() {
        cardLoader(value, text);
      };     
      button.value = value;
      document.querySelector(DomElements.genresContainer).appendChild(button);
    },

    storeToken(value) {
      document.querySelector(DomElements.hfToken).value = value;
    },

    getStoredToken() {
      return {
          token: document.querySelector(DOMElements.hfToken).value
      }
    }
  }
})();

const SpotifyLoader = (function(UICtrl, APICtrl){
  const loadGenres = async () => {
    const token = await APICtrl.getToken();
    const genres = await APICtrl.getGenres(token);
    // console.log(UICtrl);
    
    genres.forEach(element => UICtrl.createGenre(element.name, element.id));
  }
  return {
    loadGenres: loadGenres,
  }

})(UILoader, SpotifyAPI);

window.onload = async function () {
  loadClient();
  await SpotifyLoader.loadGenres();
};