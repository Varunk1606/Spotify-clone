console.log("lets write the js")
let currentSong = new Audio();
let songs = [];
let currFolder;
let currentSongIndex = 0;

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
        let a = await fetch(`songs/${folder}/`)
        let response = await a.text()
        let div = document.createElement('div')
        div.innerHTML = response
        let as = div.getElementsByTagName("a")
        songs = [];
        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            if (element.href.endsWith(".mp3")) {
                songs.push(element.href.split(`songs/${folder}/`)[1])
            }
        }

        //list in playlist
        let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0]
        songUL.innerHTML = ""
        for (const song of songs) {
            songUL.innerHTML = songUL.innerHTML + `<li>
                <img class="invert" src="img/music.svg" alt="">
                <div class="info">
                    <div> ${song.replaceAll("%20", " ")}</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div></li>`
        }
        //for song info
        Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach((e, index) => {
            e.addEventListener("click", element => {
                console.log(e.querySelector(".info").firstElementChild.innerHTML)
                currentSongIndex = index;
                playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim())
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
    currentSong.src = `songs/${currFolder}/` + track
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
        let a = await fetch(`songs/`)
        let response = await a.text();
        let div = document.createElement('div')
        div.innerHTML = response;
        let anchors = div.getElementsByTagName("a")
        let cardContainer = document.querySelector(".cardContainer")
        let array = Array.from(anchors)
        
        for (let index = 0; index < array.length; index++) {
            const e = array[index]; 
            if (e.href.includes("/songs") && !e.href.includes(".htaccess") && e.href.endsWith("/")) {
                let folder = e.href.split("/").slice(-2)[0]
                try {
                    // Get the metadata of the folder
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
        }

        //to load the song
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
