console.log("lets write the js")
let currentSong = new Audio();
let songs = [];
let currFolder;
let currentSongIndex = 0;

// Get references to DOM elements instead of relying on global id exposure
const play = document.getElementById("play");
const previous = document.getElementById("previous");
const next = document.getElementById("next");

function makeTrackUrl(folder, track) {
    // If the track already contains percent escapes like %20, assume it's encoded
    if (/%[0-9A-Fa-f]{2}/.test(track)) {
        return `songs/${folder}/${track}`;
    }
    // Otherwise, encode the track part properly
    return `songs/${folder}/${encodeURIComponent(track)}`;
}

//to time of songs in mm:ss form
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    currFolder = folder;
    try {
        // Try to fetch explicit info.json containing tracks first
        // This avoids relying on directory listing HTML which may not be available on all servers
        let infoResponse = await fetch(`songs/${folder}/info.json`).catch(() => null);
        songs = [];
        if (infoResponse && infoResponse.ok) {
            try {
                let info = await infoResponse.json();
                // if tracks array is provided in info.json, use it
                if (Array.isArray(info.tracks) && info.tracks.length > 0) {
                    songs = info.tracks;
                }
            } catch (e) {
                console.warn(`Failed to parse info.json for folder ${folder}:`, e);
            }
        }

        // Fallback to parsing directory HTML if we didn't find tracks in info.json
        if (songs.length === 0) {
            let a = await fetch(`songs/${folder}/`);
            let response = await a.text();
            let div = document.createElement('div')
            div.innerHTML = response
            let as = div.getElementsByTagName("a")
            for (let index = 0; index < as.length; index++) {
                const element = as[index];
                if (element.href.endsWith(".mp3")) {
                    songs.push(element.href.split(`songs/${folder}/`)[1])
                }
            }
        }

        //list in playlist
        let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0]
        songUL.innerHTML = ""
        for (const song of songs) {
            // Display a user-friendly name while keeping the track filename separate
            // Use replace instead of replaceAll for wider browser support
            const displayName = song.replace(/%20/g, " ")
            songUL.innerHTML = songUL.innerHTML + `<li>
                <img class="invert" src="img/music.svg" alt="">
                <div class="info">
                    <div> ${displayName}</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div></li>`
        }
        //for song info
        Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach((e, index) => {
                e.addEventListener("click", element => {
                const displayName = e.querySelector(".info").firstElementChild.innerHTML.trim();
                // Find the matching track filename from songs array using a simple decode/compare
                const matchedTrack = songs.find(s => decodeURIComponent(s) === displayName || s === displayName)
                if (matchedTrack) {
                    currentSongIndex = index;
                    playMusic(matchedTrack)
                } else {
                    console.warn("Clicked track doesn't match known song filename, trying raw displayName", displayName)
                    playMusic(displayName)
                }
            })
        })
        return songs
    } catch (error) {
        console.error("Error fetching songs:", error);
        return [];
    }
}

//for song info and time
const playMusic = (track, pause = false) => {
    currentSong.src = makeTrackUrl(currFolder, track)
    if (!pause) {
        currentSong.play();
        play.src = "img/pause.svg"
    }
    document.querySelector(".songinfo").innerHTML = decodeURI(track)
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00 "
}

//albums function
async function displayAlbums() {
    console.log("displaying albums")
    try {
        const cardContainer = document.querySelector(".cardContainer");
        cardContainer.innerHTML = "";

        // Try to fetch explicit catalog first (recommended to avoid directory listing)
        const catalogResp = await fetch(`songs/catalog.json`).catch(() => null);
        let folders = [];
        if (catalogResp && catalogResp.ok) {
            try {
                const catalog = await catalogResp.json();
                if (Array.isArray(catalog.folders) && catalog.folders.length > 0) {
                    folders = catalog.folders;
                }
            } catch (e) {
                console.warn('Failed to parse songs/catalog.json, falling back to directory parse', e);
            }
        }

        // Fallback to parsing directory listing if the catalog isn't available
        if (folders.length === 0) {
            let a = await fetch(`songs/`)
            let response = await a.text();
            let div = document.createElement('div')
            div.innerHTML = response;
            let anchors = div.getElementsByTagName("a")
            let array = Array.from(anchors)
            for (let index = 0; index < array.length; index++) {
                const e = array[index]; 
                if (e.href.includes("/songs") && !e.href.includes(".htaccess") && e.href.endsWith("/")) {
                    let folder = e.href.split("/").slice(-2)[0]
                    folders.push(folder)
                }
            }
        }

        // Build the card UI for each folder
        for (const folder of folders) {
            try {
                let a = await fetch(`songs/${folder}/info.json`)
                let response = await a.json(); 
                cardContainer.innerHTML = cardContainer.innerHTML + ` <div data-folder="${folder}" class="card">
                    <div class="play">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                                stroke-linejoin="round" />
                        </svg>
                    </div>

                    <img src="songs/${folder}/cover.png" alt="">
                    <h2>${response.title}</h2>
                    <p>${response.description}</p>
                </div>`
            } catch (error) {
                console.error(`Error loading info for folder ${folder}:`, error);
            }
        }
        console.log(`displayAlbums: built ${folders.length} cards`);

        //to load the song
        // Bind click handlers after the cards are added to the DOM
        Array.from(document.getElementsByClassName("card")).forEach(e => {
            e.addEventListener("click", async item => {
                console.log("Fetching Songs")
                let folder = item.currentTarget.dataset.folder;
                songs = await getSongs(folder)
                if (songs.length > 0) {
                    currentSongIndex = 0;
                    playMusic(songs[0])
                }
            })
        })
        if (document.getElementsByClassName('card').length === 0) {
            console.warn('displayAlbums: no cards found - check songs/catalog.json or directory listing');
        }
    } catch (error) {
        console.error("Error displaying albums:", error);
    }
}

async function main() {
    //get all list of song
    await getSongs("ncs")
    if (songs.length > 0) {
        playMusic(songs[0], true)
    }
    //to display the albums
    await displayAlbums()

    //event for play,nextand previous button
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play()
            play.src = "img/pause.svg"
        }
        else {
            currentSong.pause()
            play.src = "img/play.svg"
        }
    })
    //timeupdate
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    })
    //seekbar 
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percentage = (e.offsetX / e.target.getBoundingClientRect().width) * 100
        document.querySelector(".circle").style.left = percentage + "%";
        currentSong.currentTime = ((currentSong.duration) * percentage) / 100;
    })
    //humburger button
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })
    //close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })
    //previous button
    previous.addEventListener("click", () => {
        currentSong.pause()
        console.log("Previous Clicked")
        if (currentSongIndex > 0) {
            currentSongIndex--;
            playMusic(songs[currentSongIndex])
        }
    })
    //next button
    next.addEventListener("click", () => {
        currentSong.pause()
        console.log("Next Clicked")
        if (currentSongIndex < songs.length - 1) {
            currentSongIndex++;
            playMusic(songs[currentSongIndex])
        }
    })
    //to set the volume
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        console.log("setting Song", e.target.value, "/100");
        currentSong.volume = parseInt(e.target.value) / 100
        if (currentSong.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("img/mute.svg", "img/volume.svg")
        }
    });
    //to mute the volume
    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("img/volume")) {
            e.target.src = e.target.src.replace("img/volume.svg", "img/mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else {
            e.target.src = e.target.src.replace("img/mute.svg", "img/volume.svg")
            currentSong.volume = 0.10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }
    })

    // Play next song automatically when current ends
    currentSong.addEventListener("ended", () => {
        if (currentSongIndex < songs.length - 1) {
            currentSongIndex++;
            playMusic(songs[currentSongIndex]);
        }
    });
}
main()
