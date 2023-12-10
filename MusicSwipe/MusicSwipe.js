const swiper = new Swiper('.swiper', {
    // Optional parameters
    direction: 'vertical',
    loop: false,
  
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

class VideoData {
  constructor(songName, spotifySongId, spotifyGenre) {
      this.songName = songName;
      this.spotifySongId = spotifySongId;
      this.spotifyGenre = spotifyGenre;
      this.watchTime = 0;
  }

  updateWatchTime(newTime) {
      this.watchTime += newTime;
  }
}

function loadClient() {
  gapi.client.setApiKey("AIzaSyDxXfbbJRF_Ntu9zReVK1bcZ7LNiOH-9K0"); // Music Swipe API
  // gapi.client.setApiKey("AIzaSyCQEU37aU2xl3X0WeijqS7RDqjHEkAdcvM"); // Music Swipe 2 API
  return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
      .then(function() { console.log("GAPI client loaded for API"); },
            function(err) { console.error("Error loading GAPI client for API", err); });
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
  const _getTracks = async (token, tracksEndPoint, offset = 0) => {
    const limit = 100;
    const result = await fetch(`${tracksEndPoint}?limit=${limit}&offset=${offset}`, {
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
    getTracks(token, tracksEndPoint, offset) {
        return _getTracks(token, tracksEndPoint, offset);
    },
    getTrack(token, trackEndPoint) {
        return _getTrack(token, trackEndPoint);
    }
  }

})();

let selectedTrackIds = [];

async function getRandomSpotifyTracks(token, tracksEndPoint, numberOfTracks = 1) {
  console.log ("Random Song: " + numberOfTracks);
  const maxOffset = 50; // Adjust based on total tracks available
  const randomOffset = Math.floor(Math.random() * maxOffset);
  const tracks = await SpotifyAPI.getTracks(token, tracksEndPoint, randomOffset);
  
  let selectedTracks = [];
  let attempts = 0;

  for (let i = 0; i < numberOfTracks; i++) {
    const randomIndex = Math.floor(Math.random() * tracks.length);
    const song = tracks[randomIndex];

    if (song && !selectedTrackIds.includes(song.track.id)) {
      selectedTracks.push(song);
      selectedTrackIds.push(song.id); // Add track ID to the list of selected tracks
    }
    attempts++;
  }
  console.log(selectedTracks);
  // console.log("Random Song" + selectedTracks.track.name);

  return selectedTracks;
}

let videoIndex = 0;

async function populateCard(trackTitle, autoplay, spotifySongId, spotifyGenre) {
  try {
    // await loadClient(); // Ensure YouTube API client is loaded
    const response = await gapi.client.youtube.search.list({
      part: "snippet",
      maxResults: 1,
      q: `${trackTitle} music video`
    });
    await console.log("query:" + JSON.stringify(response.result, null, 2));
    await console.log("Populate" + " " + trackTitle + " " + videoIndex);

    const videoId = response.result.items[0].id.videoId;
    const iframeUrl = `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=${autoplay}&enablejsapi=1`;

    const swiperContainer = document.querySelector('#card-container');
    const newSlide = document.createElement('div');

    newSlide.dataset.songName = trackTitle;
    newSlide.dataset.spotifySongId = spotifySongId;
    newSlide.dataset.spotifyGenre = spotifyGenre;

    newSlide.classList.add('swiper-slide');
    newSlide.innerHTML = `<div class="overlay"></div>`;
    newSlide.innerHTML += `<iframe class="yt_player" width="560" height="315" src="${iframeUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    swiperContainer.appendChild(newSlide);

    swiper.update();
    videoIndex++;
  } catch (error) {
    console.error('Error populating card:', error);
  }
}

const cardLoader = async function(genreId, genreName) {
  try {
    const token = await SpotifyAPI.getToken();
    const playlists = await SpotifyAPI.getPlaylistByGenre(token, genreId);

    const initialTracks = await getRandomSpotifyTracks(token, playlists[0].tracks.href, 2);

    // Map each track to a promise of a populated card
    const populatePromises = initialTracks.map((song, index) => {
      const autoplay = (index === 0) ? 1 : 0; // Autoplay only the first video
      return populateCard(song.track.name, autoplay, song.track.id, genreId);
    });

    // Wait for all cards to be populated
    await Promise.all(populatePromises);

    // Setup swiper event listener for loading new cards
    setupSwiperListener(token, playlists[0].tracks.href);
  } catch (error) {
    console.error('Error in cardLoader:', error);
  }
};

function setupSwiperListener(token, tracksHref) {
  let currentVideo = null;
  let videoStartTime = 0;
  swiper.on('slideChangeTransitionStart', async function () {
    
    swiper.on('slideChangeTransitionStart', async function () {
      if (currentVideo && videoStartTime !== 0) {
          let watchDuration = (Date.now() - videoStartTime) / 1000;
          currentVideo.updateWatchTime(watchDuration);
  
          // Process or store currentVideo data as needed
          console.log(currentVideo);
      }
  
      // Assuming you store song data in the slide's dataset
      let activeSlideData = swiper.slides[swiper.activeIndex].dataset;
      if (activeSlideData) {
          currentVideo = new VideoData(activeSlideData.songName, activeSlideData.spotifySongId, activeSlideData.spotifyGenre);
          videoStartTime = Date.now();
      }
  

    if (swiper.activeIndex === swiper.slides.length - 1) {
      const newTracks = await getRandomSpotifyTracks(token, tracksHref, 1);
      populateCard(newTracks[0].track.name, 1);
      
      
      let nextSlideIndex = swiper.previousIndex; // Index of slide that is currently active
      let nextSlide = swiper.slides[nextSlideIndex]; // Get the current slide
      let nextIframe = nextSlide.querySelector('.yt_player'); // Find the YouTube player in the current slide
    
      // if (nextIframe) {
      //   nextIframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
      // }
    
      // let activeSlide = swiper.slides[swiper.activeIndex];
      //   let activeIframe = activeSlide.querySelector('.yt_player');
      //   if (activeIframe && activeIframe.contentWindow) {
      //       activeIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      //   }
      
    }
  });
}

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