document.addEventListener("DOMContentLoaded", () => {
  let guesses = 6;
  let hints = 4;
  let country;
  let countryCode;
  let guessedCountryCount = 0;

  createGuesses();
  restoreLocalStorage();
  getNewCountryWordle();

  function restoreLocalStorage() {
    for (let index = 0; index < guesses; index++) {
      let storedCountry = getLocalStorageElement("countrywordle_guess" + (index + 1) + "_country")
      if (storedCountry != null) {
        let storedDistance = getLocalStorageElement("countrywordle_guess" + (index + 1) + "_distance")
        let storedAngle = getLocalStorageElement("countrywordle_guess" + (index + 1) + "_angle")
        let storedCC = getLocalStorageElement("countrywordle_guess" + (index + 1) + "_cc")
        document.getElementById(String(guessedCountryCount * 4 + 1)).textContent = storedCountry;
        document.getElementById(String(guessedCountryCount * 4 + 2)).textContent = storedDistance + "km";
        document.getElementById(String("span" + (guessedCountryCount * 4 + 3))).textContent = "➔";
        document.getElementById(String("span" + (guessedCountryCount * 4 + 3))).style.transform = "rotate(" + (-90 + storedAngle) + "deg)";
        document.getElementById(String("image" + (guessedCountryCount * 4 + 4))).setAttribute("src", "https://www.geonames.org/flags/x/" + storedCC + ".gif")

        guessedCountryCount++;
      }
    }
    document.getElementById("flag").style.filter = "blur(" + (60 - guessedCountryCount * 10) + "px)";

    let hideFlag = getLocalStorageElement("countrywordle_hideflag")
    if (hideFlag != null) {
      document.getElementById("flag").style.visibility = hideFlag;
      document.getElementById("checkbox").checked = hideFlag === "hidden";
    }

    let result = getLocalStorageElement("countrywordle_result");
    if (result === "win") {
      win();
    } else if (result === "loss") {
      loss();
    }
  }

  function win() {
    setLocalStorageElement("countrywordle_result", "win");
    document.getElementById('failed').innerHTML = "Congratulations!";
    document.getElementById('refresh_s').innerHTML = "⟳"
    document.getElementById("refresh_a").addEventListener("click", () => {
      resetLocalStorage("countrywordle_");
      location.reload()
    });
  }

  function loss() {
    setLocalStorageElement("countrywordle_result", "loss");
    document.getElementById('failed').innerHTML = `Sorry, you have no more guesses! The country is ${country}.`;
    document.getElementById('refresh_s').innerHTML = "⟳"
    document.getElementById("refresh_a").addEventListener("click", () => {
      resetLocalStorage("countrywordle_");
      location.reload()
    });
  }

  function getNewCountryWordle() {
    get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/worldle/get', {player_id: getLocalStorageElement("player_id")})
      .then(response => response.json())
      .then(response => {
        country = response.data.country;
        countryCode = response.data.cc;
        document.getElementById("flag").setAttribute("src", "https://www.geonames.org/flags/x/" + countryCode + ".gif")

        let list = document.getElementById('country_data');
        response.data.all.forEach(function (country) {
          let option = document.createElement('option');
          option.value = country;
          list.appendChild(option);
        });
      })
      .catch((err) => console.debug(err));
  }

  function createGuesses() {
    const gameBoard = document.getElementById("board");

    for (let index = 0; index < guesses * hints; index++) {
      let square = document.createElement("div");
      square.classList.add("square");
      square.classList.add("animate__animated");
      square.setAttribute("class", "square");
      square.setAttribute("id", String(index + 1));
      if (index % 4 === 2) {
        let sp = document.createElement("span");
        sp.setAttribute("id", "span" + (index + 1));
        square.appendChild(sp);
      } else if (index % 4 === 3) {
        let im = document.createElement("img");
        im.setAttribute("id", "image" + (index + 1));
        square.appendChild(im);
      }
      gameBoard.appendChild(square);
    }
  }

  function handleSubmitWord() {
    const form = document.getElementById('country_form');

    get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/worldle/guess', {
      player_id: getLocalStorageElement("player_id"),
      guess: form.elements["country"].value,
      guess_no: guessedCountryCount + 1
    })
      .then(response => response.json())
      .then(response => {
        document.getElementById("flag").style.filter = "blur(" + (50 - guessedCountryCount * 10) + "px)";
        document.getElementById(String(guessedCountryCount * 4 + 1)).textContent = response.data.guess.country;
        document.getElementById(String(guessedCountryCount * 4 + 2)).textContent = response.data.guess.distance + "km";
        document.getElementById(String("span" + (guessedCountryCount * 4 + 3))).textContent = "➔";
        document.getElementById(String("span" + (guessedCountryCount * 4 + 3))).style.transform = "rotate(" + (-90 + response.data.guess.angle) + "deg)";
        document.getElementById(String("image" + (guessedCountryCount * 4 + 4))).setAttribute("src", "https://www.geonames.org/flags/x/" + response.data.guess.cc + ".gif")

        guessedCountryCount += 1;

        setLocalStorageElement("countrywordle_guess" + guessedCountryCount + "_country", response.data.guess.country);
        setLocalStorageElement("countrywordle_guess" + guessedCountryCount + "_distance", response.data.guess.distance);
        setLocalStorageElement("countrywordle_guess" + guessedCountryCount + "_angle", response.data.guess.angle);
        setLocalStorageElement("countrywordle_guess" + guessedCountryCount + "_cc", response.data.guess.cc);

        document.getElementById('failed').innerHTML = "";
        if (response.data["win"] === true) {
          document.getElementById(String("image" + ((guessedCountryCount - 1) * 4 + 4))).setAttribute("src", "https://www.geonames.org/flags/x/" + countryCode + ".gif")
          document.getElementById("flag").style.filter = "blur(0px)";
          win();
        } else if (guessedCountryCount === guesses) {
          loss();
        }
      })
      .catch((err) => console.debug(err));
  }


  (() => {
    const form = document.getElementById('country_form');

    form.addEventListener('submit', e => {
      e.preventDefault();
      handleSubmitWord();
      form.elements["country"].value = "";
    });
  })();
});

function hideOrShowFlag() {
  let flag = document.getElementById("flag");
  let hideFlag =  flag.style.visibility === "hidden"? "visible": "hidden";
  flag.style.visibility = hideFlag;
  setLocalStorageElement("countrywordle_hideflag", hideFlag);
}
