document.addEventListener("DOMContentLoaded", () => {
  let letters = 5;
  let guessedWords = [[]];
  let guesses = 6;
  let availableSpace = 1;
  let word;
  let guessedWordCount = 0;

  let green = "#008000";
  let greenRGB = "rgb(0, 128, 0)";
  let yellowRGB = "rgb(255, 165, 0)";

  const keys = document.querySelectorAll(".keyboard-row button");

  createTiles();
  restoreLocalStorage();
  if (word == null) {
    getNewWord();
  }

  function restoreLocalStorage() {
    for (let index = 0; index < guesses; index++) {
      let storedEl = getLocalStorageElement("starwars_guess" + (index + 1))
      if (storedEl != null) {
        if (storedEl.length !== letters) {
          resetLocalStorage("starwars");
          return;
        }
        for (let c = 0; c < letters; c++) {
          let square = document.getElementById(String(index * letters + c + 1));
          square.textContent = storedEl[c];

          if (c + 1 === letters) {
            guessedWords.push([]);
          }
          guessedWords[index].push(storedEl[c]);
        }
        guessedWordCount++;
        availableSpace += letters;
      }
    }

    for (let index = 0; index < guesses * letters; index++) {
      let square = document.getElementById(String(index + 1));

      let storedEl = getLocalStorageElement("starwars_tile" + (index + 1))
      if (storedEl != null) {
        square.style.backgroundColor = storedEl;
      }
    }

    for (let i = 0; i < keys.length; i++) {
      let storedKey = getLocalStorageElement("starwars_key_" + keys[i].textContent);
      if (storedKey != null) {
        keys[i].style.backgroundColor = `${storedKey}`;
        keys[i].style.borderColor = `${storedKey}`;
      }
    }

    word = getLocalStorageElement("starwars_word");

    let result = getLocalStorageElement("starwars_result");
    if (result === "win") {
      win();
    } else if (result === "loss") {
      loss();
    }
  }

  function win() {
    setLocalStorageElement("starwars_result", "win");
    document.getElementById('failed').innerHTML = "Congratulations!";
    document.getElementById('refresh_s').innerHTML = "⟳"
    document.getElementById("refresh_a").addEventListener("click", () => {
      resetLocalStorage("starwars");
      location.reload()
    });
  }

  function loss() {
    setLocalStorageElement("starwars_result", "loss");
    document.getElementById('failed').innerHTML = `Sorry, you have no more guesses! The word is ${word}.`;
    document.getElementById('refresh_s').innerHTML = "⟳"
    document.getElementById("refresh_a").addEventListener("click", () => {
      resetLocalStorage("starwars");
      location.reload()
    });
  }

  function getNewWord() {
    get('ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/starwars/get', {player_id: getLocalStorageElement("player_id"), word_length: letters})
      .then(response => response.json())
      .then(response => {
        word = response.data
        setLocalStorageElement("starwars_word", word);
      })
      .catch((err) => console.debug(err));
  }

  function getCurrentWordArr() {
    const numberOfGuessedWords = guessedWords.length;
    return guessedWords[numberOfGuessedWords - 1];
  }

  function updateGuessedWords(letter) {
    const currentWordArr = getCurrentWordArr();

    if (currentWordArr && currentWordArr.length < letters) {
      currentWordArr.push(letter);

      const availableSpaceEl = document.getElementById(String(availableSpace));

      availableSpace = availableSpace + 1;
      availableSpaceEl.textContent = letter;
    }
  }

  function handleSubmitWord() {
    const currentWordArr = getCurrentWordArr();
    if (currentWordArr.length !== letters) {
      document.getElementById('failed').innerHTML = "Word must be " + letters + " letters";
      return
    }

    const currentWord = currentWordArr.join("");
    get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/starwars/guess', {
      player_id: getLocalStorageElement("player_id"),
      guess: currentWord,
      word_length: letters
    })
      .then(response => response.json())
      .then(response => {
        const firstLetterId = guessedWordCount * letters + 1;
        const interval = 200;
        currentWordArr.forEach((letter, index) => {
          setTimeout(() => {
            const tileColor = response.data.guess[index]

            const letterId = firstLetterId + index;
            const letterEl = document.getElementById(String(letterId));
            letterEl.classList.add("animate__flipInX");
            letterEl.style.backgroundColor = `${tileColor}`;
            letterEl.style.borderColor = `${tileColor}`;
            setLocalStorageElement("starwars_tile" + letterId, tileColor);

            let key = document.querySelector("[data-key=\"" + letter + "\"]")
            if (!(key.style.backgroundColor === greenRGB || (key.style.backgroundColor === yellowRGB && tileColor !== green))) {
              document.querySelector("[data-key=\"" + letter + "\"]").style.backgroundColor = `${tileColor}`;
              setLocalStorageElement("starwars_key_" + letterEl.textContent, tileColor)
            }
          }, interval * index);
        });

        guessedWordCount += 1;

        setLocalStorageElement("starwars_guess" + guessedWordCount, currentWord);

        document.getElementById('failed').innerHTML = "";
        if (response.data["win"] === true) {
          win();
        } else if (guessedWords.length === guesses) {
          loss();
        }

        guessedWords.push([]);
      })
      .catch((err) => console.debug(err));
  }

  function createTiles() {
    const gameBoard = document.getElementById("board");
    gameBoard.style.gridTemplateColumns = "repeat(" + letters + ", 1fr)"

    for (let index = 0; index < guesses * letters; index++) {
      let square = document.createElement("div");
      square.classList.add("square");
      square.classList.add("animate__animated");
      square.setAttribute("id", String(index + 1));
      gameBoard.appendChild(square);
    }
  }

  function handleDeleteLetter() {
    if ((availableSpace - 1) % letters === 0 && (availableSpace - 1) / letters === guessedWordCount) {
      return
    }

    const currentWordArr = getCurrentWordArr();
    currentWordArr.pop();

    guessedWords[guessedWords.length - 1] = currentWordArr;

    const lastLetterEl = document.getElementById(String(availableSpace - 1));

    lastLetterEl.textContent = "";
    availableSpace = availableSpace - 1;
  }

  for (let i = 0; i < keys.length; i++) {
    keys[i].onclick = ({target}) => {
      const letter = target.getAttribute("data-key");

      if (letter === "enter") {
        handleSubmitWord();
        return;
      }

      if (letter === "del") {
        handleDeleteLetter();
        return;
      }

      updateGuessedWords(letter);
    };
  }

  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      return;
    }

    const letter = event.key.toLowerCase()

    if (letter === "enter") {
      handleSubmitWord();
      return;
    }

    if (letter === "backspace") {
      handleDeleteLetter();
      return;
    }

    if (!(/^[a-z0-9]$/i.test(event.key))) {
      return
    }

    updateGuessedWords(letter);
  }, false);
});
