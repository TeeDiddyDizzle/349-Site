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
    lastIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
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
  // gapi.client.setApiKey("AIzaSyDxXfbbJRF_Ntu9zReVK1bcZ7LNiOH-9K0"); // Music Swipe API
  gapi.client.setApiKey("AIzaSyCQEU37aU2xl3X0WeijqS7RDqjHEkAdcvM"); // Music Swipe 2 API
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

  const _getRecommendations = async (token, seedTracks, seedArtists, seedGenres, trackAttributes) => {
    const queryParams = new URLSearchParams({
      limit: 20, 
      market: 'from_token', 
      seed_tracks: seedTracks.join(','), 
      seed_artists: seedArtists.join(','), 
      seed_genres: seedGenres.join(','), 
    });

    if (trackAttributes && Object.keys(trackAttributes).length > 0) {
      // Add track attributes to the query parameters if any additional attributes are passed.
      for (const [key, value] of Object.entries(trackAttributes)) {
        queryParams.append(key, value);
      }
    }

    const result = await fetch(`https://api.spotify.com/v1/recommendations?${queryParams}`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await result.json();
    return data.tracks;
  };

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
    },
    getRecommendations(token, seedTracks, seedArtists, seedGenres, trackAttributes) {
      return _getRecommendations(token, seedTracks, seedArtists, seedGenres, trackAttributes);
    }
  };

})();

let selectedTrackIds = [];

async function getRandomSpotifyTracks(token, tracksEndPoint, numberOfTracks = 1) {
  // console.log ("Random Song: " + numberOfTracks);
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
      selectedTrackIds.push(song.track.id); // Add track ID to the list of selected tracks
    }
    attempts++;
  }
  // console.log("Random Track Data" + selectedTracks);

  return selectedTracks;
}

async function updateRecommendations() {
  const token = await SpotifyAPI.getToken();
  const seedTracks = ['4iV5W9uYEdYUVa79Axb7Rh']; // Example seed track IDs
  const seedArtists = ['0LcJLqbBmaGUft1e9Mm8HV']; // Example seed artist IDs
  const seedGenres = ['electro']; // Example seed genres
  const trackAttributes = {
    target_danceability: 0.8,
    target_energy: 0.7
  };

  const recommendations = await SpotifyAPI.getRecommendations(token, seedTracks, seedArtists, seedGenres, trackAttributes);
  
  // Now use the recommendations to populate your UI
  // ...
}

let videoIndex = 0;

async function populateCard(trackTitle, autoplay, spotifySongId, spotifyGenre) {
  try {
    // const response = await gapi.client.youtube.search.list({
    //   part: "snippet",
    //   maxResults: 1,
    //   q: `${trackTitle} music video`
    // });
    await console.log("\nPopulate" + " " + trackTitle + " " + videoIndex);

    // const videoId = response.result.items[0].id.videoId;
    // const iframeUrl = `https://www.youtube.com/embed/${videoId}?quality=highres?rel=0&autoplay=${autoplay}&enablejsapi=1`;
    const iframeUrl = `https://www.youtube.com/embed/EIilZl_iuIo?quality=highres?rel=0&autoplay=${autoplay}&enablejsapi=1`;

    // Get viewport width 
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    const vw = Math.max(document.documentElement.clientWdith || 0, window.innerWidth || 0)

    // console.log("width:" + vw + " height:" + vh);
    // Set iframe width to viewport width
    const iframeHeight = vh; 

    // Set iframe height based on 16:9 aspect ratio
    const iframeWidth = vh / 0.5625; 
    var iframe;
    // Create iframe
    if (vw > 768) {
      iframe = `
      <iframe 
        class="yt_player"
        width="${iframeWidth}" 
        height="${iframeHeight}"
        src="${iframeUrl}" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
    }
    else {
      iframe = `
      <iframe 
        class="yt_player"
        width="${iframeWidth}" 
        height="${iframeHeight}"
        src="${iframeUrl}"
        style="width: ${iframeWidth}px; left: calc(50% - ${iframeWidth / 2}px);"
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
    }

    // Create a new VideoData instance for the card
    let videoData = new VideoData(trackTitle, spotifySongId, spotifyGenre);

    // Add the new VideoData instance to the map
    videoDataMap[spotifySongId] = videoData;

    if (videoIndex === 0) {
      console.log("First video");
      currentVideo = new VideoData(trackTitle, spotifySongId, spotifyGenre);
      // currentVideo = swiper.slides[swiper.activeIndex].dataset
      // let previousSlideData = swiper.slides[swiper.previousIndex].dataset;
      videoStartTime = Date.now();
    }

    const swiperContainer = document.querySelector('#card-container');
    const newSlide = document.createElement('div');

    newSlide.dataset.songName = trackTitle;
    newSlide.dataset.spotifySongId = spotifySongId;
    newSlide.dataset.spotifyGenre = spotifyGenre;

    newSlide.classList.add('swiper-slide');
    newSlide.innerHTML = `<div class="overlay">${trackTitle}</div>`;
    newSlide.innerHTML += iframe;
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

    for (let i = 0; i < initialTracks.length; i++) {
      const song = initialTracks[i];
      const autoplay = (i === 0) ? 1 : 0;
      await populateCard(song.track.name, autoplay, song.track.id, genreId); // Await for each card to be populated
    }

    const floatingButtons = `
      <div class="floating-buttons">
        <button id="dislikeButton" class="floating-btn dislike">Dislike</button> 
        <button id="likeButton" class="floating-btn like">Like</button>
      </div>
    `;

    await document.getElementById('genre-head').remove();
    await document.getElementById('genres-container').remove();
    await document.querySelector('.swiper').insertAdjacentHTML('afterbegin', floatingButtons);


    // Setup swiper event listener for loading new cards
    setupSwiperListener(token, playlists[0].tracks.href);
  } catch (error) {
    console.error('Error in cardLoader:', error);
  }
};

let videoDataMap = {}; // This object will store the VideoData instances by spotifySongId
let currentVideo = null;
let videoStartTime = 0;

function setupSwiperListener(token, tracksHref) {


  swiper.on('slideChangeTransitionStart', async function () {
    let previousSlideData = swiper.slides[swiper.previousIndex].dataset;
    if (previousSlideData && previousSlideData.spotifySongId) {
      var previousVideo;
      if (videoIndex == 0) {
        previousVideo = videoDataMap[swiper.slides[swiper.activeIndex].dataset.spotifySongId];
      } else {
        previousVideo = videoDataMap[previousSlideData.spotifySongId];
      }
      if ((previousVideo && videoStartTime !== 0)) {
        let watchDuration = (Date.now() - videoStartTime) / 1000;
        previousVideo.updateWatchTime(watchDuration);
        console.log(previousVideo);
      }
    }

    let activeSlideData = swiper.slides[swiper.activeIndex].dataset;
    if (activeSlideData && activeSlideData.spotifySongId) {
      if (!videoDataMap[activeSlideData.spotifySongId]) {
        // If we don't have a VideoData object for this song, create one
        videoDataMap[activeSlideData.spotifySongId] = new VideoData(
          activeSlideData.songName,
          activeSlideData.spotifySongId,
          activeSlideData.spotifyGenre
        );
      }
      currentVideo = videoDataMap[activeSlideData.spotifySongId];
      videoStartTime = Date.now();
    }

    // Load new cards if we reach the end
    if (swiper.activeIndex === swiper.slides.length - 1) {
      const newTracks = await getRandomSpotifyTracks(token, tracksHref, 1);
      await populateCard(newTracks[0].track.name, 0, newTracks[0].track.id, activeSlideData.spotifyGenre);
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