document.addEventListener("DOMContentLoaded", () => {
  let guesses = 6;
  let fields = 3;
  let movie;
  let guessedMovieCount = 0;

  createGuesses();
  restoreLocalStorage();
  getNewMovieWordle();

  function restoreLocalStorage() {
    for (let index = 0; index < guesses; index++) {
      let storedName = getLocalStorageElement("moviewordle_guess" + (index + 1) + "_name")
      if (storedName != null) {
        let storedInfo = getLocalStorageElement("moviewordle_guess" + (index + 1) + "_info")
        document.getElementById(String(guessedMovieCount * fields + 1)).textContent = storedName;
        document.getElementById(String(guessedMovieCount * fields + 2)).textContent = storedInfo;
        if (storedInfo.length > 50) {
          document.getElementById(String(guessedMovieCount * fields + 2)).style.display = "block";
        }
      }

      let storedMovie = getLocalStorageElement("moviewordle_guess" + (index + 1) + "_movie")
      if (storedMovie != null) {
        document.getElementById(String(guessedMovieCount * fields + 3)).textContent = storedMovie;
        if (storedMovie.length > 20) {
          document.getElementById(String(guessedMovieCount * fields + 3)).style.display = "block";
        }
        guessedMovieCount++;
      }
    }
    document.getElementById("poster").style.filter = "blur(" + (60 - guessedMovieCount * 10) + "px)";

    let hidePoster = getLocalStorageElement("moviewordle_hideposter")
    if (hidePoster != null) {
      document.getElementById("poster").style.visibility = hidePoster;
      document.getElementById("checkbox").checked = hidePoster === "hidden";
    }

    let result = getLocalStorageElement("moviewordle_result");
    if (result === "win") {
      win();
    } else if (result === "loss") {
      loss();
    }
  }

  function win() {
    setLocalStorageElement("moviewordle_result", "win");
    document.getElementById('failed').innerHTML = "Congratulations!";
    document.getElementById('refresh_s').innerHTML = "⟳"
    document.getElementById("refresh_a").addEventListener("click", () => {
      resetLocalStorage("moviewordle");
      location.reload()
    });
  }

  function loss() {
    setLocalStorageElement("moviewordle_result", "loss");
    document.getElementById('failed').innerHTML = `Sorry, you have no more guesses! The movie is ${movie}.`;
    document.getElementById('refresh_s').innerHTML = "⟳"
    document.getElementById("refresh_a").addEventListener("click", () => {
      resetLocalStorage("moviewordle");
      location.reload()
    });
  }

  function getNewMovieWordle() {
    get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/movie/get', {player_id: getLocalStorageElement("player_id"), guess_no: guessedMovieCount})
      .then(response => response.json())
      .then(response => {
        movie = response.data.movie;
        let list = document.getElementById('movie_data');
        response.data.all.forEach(function (movie) {
          let option = document.createElement('option');
          option.value = movie;
          list.appendChild(option);
        });

        let info = (response.data.info === "" || response.data.info === 0) ? "-" : response.data.info;
        document.getElementById(String(guessedMovieCount * fields + 1)).textContent = response.data.name;
        document.getElementById(String(guessedMovieCount * fields + 2)).textContent = info;
        if (info.length > 50) {
          document.getElementById(String(guessedMovieCount * fields + 2)).style.display = "block";
        }
        setLocalStorageElement("moviewordle_guess" + (guessedMovieCount + 1) + "_name", response.data.name);
        setLocalStorageElement("moviewordle_guess" + (guessedMovieCount + 1) + "_info", info);

        get("https://api.themoviedb.org/3/search/movie?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&query=" + movie)
          .then(response => response.json())
          .then(response => {
            let poster = "https://image.tmdb.org/t/p/w500/" + response.results[0].poster_path;
            document.getElementById("poster").setAttribute("src", poster);
          })
          .catch((err) => console.debug(err));
      })
      .catch((err) => console.debug(err));
  }

  function createGuesses() {
    const gameBoard = document.getElementById("board");

    for (let index = 0; index < guesses * fields; index++) {
      let square = document.createElement("div");
      square.classList.add("square");
      square.classList.add("animate__animated");
      square.setAttribute("class", "square");
      square.setAttribute("id", String(index + 1));
      gameBoard.appendChild(square);
    }
  }

  function handleSubmitWord() {
    const form = document.getElementById('movie_form');

    get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/movie/guess', {
      player_id: getLocalStorageElement("player_id"),
      guess: form.elements["movie"].value,
      guess_no: guessedMovieCount + 1
    })
      .then(response => response.json())
      .then(response => {
        document.getElementById("poster").style.filter = "blur(" + (50 - guessedMovieCount * 10) + "px)";
        document.getElementById(String(guessedMovieCount * fields + 3)).textContent = response.data.guess.movie;
        if (response.data.guess.movie.length > 20) {
          document.getElementById(String(guessedMovieCount * fields + 3)).style.display = "block";
        }

        guessedMovieCount += 1;

        setLocalStorageElement("moviewordle_guess" + guessedMovieCount + "_movie", response.data.guess.movie);

        document.getElementById('failed').innerHTML = "";
        if (response.data["win"] === true) {
          document.getElementById("poster").style.filter = "blur(0px)";
          win();
        } else if (guessedMovieCount === guesses) {
          loss();
        } else {
          let info = (response.data.guess.info === "" || response.data.guess.info === 0) ? "-" : response.data.guess.info;
          document.getElementById(String(guessedMovieCount * fields + 1)).textContent = response.data.guess.name;
          document.getElementById(String(guessedMovieCount * fields + 2)).textContent = info;
          setLocalStorageElement("moviewordle_guess" + (guessedMovieCount + 1) + "_name", response.data.guess.name);
          setLocalStorageElement("moviewordle_guess" + (guessedMovieCount + 1) + "_info", info);
        }
      })
      .catch((err) => console.debug(err));
  }


  (() => {
    const form = document.getElementById('movie_form');

    form.addEventListener('submit', e => {
      e.preventDefault();
      handleSubmitWord();
      form.elements["movie"].value = "";
    });
  })();
});

function hideOrShowPoster() {
  let poster = document.getElementById("poster");
  let hidePoster =  poster.style.visibility === "hidden"? "visible": "hidden";
  poster.style.visibility = hidePoster;
  setLocalStorageElement("moviewordle_hideposter", hidePoster);
}
