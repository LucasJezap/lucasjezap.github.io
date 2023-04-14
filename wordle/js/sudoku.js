document.addEventListener("DOMContentLoaded", () => {
  let size = 9;

  let numberColor = "rgb(220,12,12)";
  let errorColor = "rgba(210,112,112,0.5)";
  let noColor = "";
  let clickColor = "rgb(129, 131, 132)";

  let sudoku;
  let answer;
  let solution;
  let chosenElement;
  const keys = document.querySelectorAll(".keyboard-row button");
  createSudoku();
  getNewSudoku();

  function win() {
    setLocalStorageElement("sudoku_win", "true");
    document.getElementById('failed').innerHTML = "Congratulations!";
    document.getElementById('refresh_s').innerHTML = "⟳"
    document.getElementById("refresh_a").addEventListener("click", () => {
      location.reload()
    });
  }

  function resetWin() {
    removeLocalStorageElement("sudoku_win");
    document.getElementById('failed').innerHTML = "";
    document.getElementById('refresh_s').innerHTML = ""
    document.getElementById("refresh_a").removeEventListener("click", () => {
      location.reload()
    });
  }

  function getNewSudoku() {
    get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/sudoku/get', {player_id: localStorage.getItem("player_id"), new_sudoku: getLocalStorageElement("sudoku_win")})
      .then(response => response.json())
      .then(response => {
        resetLocalStorage("sudoku");
        sudoku = response.data.sudoku;
        solution = response.data.solution;
        answer = sudoku;

        for (let index = 0; index < size * size; index++) {
          let storedEl = localStorage.getItem("sudoku_" + (index + 1))
          let square = document.getElementById(String(index + 1));
          let gameBoard = document.getElementById("board");

          if (sudoku[index] !== "0") {
            square.textContent = sudoku[index];
            answer = replaceCharacter(answer,index,sudoku[index]);
          } else if (storedEl != null) {
            square.textContent = storedEl;
            square.style.color = numberColor;
            answer = replaceCharacter(answer,index,storedEl);
          }

          if (sudoku[index] === "0") {
            square.addEventListener("click", function () {
              let enable = square.style.backgroundColor !== clickColor;
              Array.from(gameBoard.children, function (s) {
                if (s.style.backgroundColor === clickColor) {
                  s.style.backgroundColor = noColor;
                }
              });
              if (enable) {
                square.style.backgroundColor = clickColor;
                chosenElement = square;
              } else {
                square.style.backgroundColor = noColor;
                chosenElement = null;
              }
            });
          }
          checkErrors();
        }
        if (answer === solution)  {
          win();
        }
      })
      .catch((err) => console.debug(err));
  }

  function updateSudoku(key) {
    if (chosenElement == null) {
      return;
    }

    chosenElement.textContent = key;
    chosenElement.style.color = numberColor;

    const gameBoard = document.getElementById("board");
    Array.from(gameBoard.children, function (s) {
      if (s.style.backgroundColor === clickColor) {
        s.style.backgroundColor = noColor;
      }
    });
    chosenElement.style.backgroundColor = noColor;

    answer = replaceCharacter(answer,chosenElement.id-1,key);
    localStorage.setItem("sudoku_" + chosenElement.id, key)
    chosenElement = null;
    checkErrors();


    if (answer === solution) {
      win();
    } else {
      resetWin();
    }
  }

  function createSudoku() {
    const gameBoard = document.getElementById("board");

    for (let index = 0; index < size * size; index++) {
      let square = document.createElement("div");
      square.classList.add("square");
      square.classList.add("animate__animated");
      square.setAttribute("id", String(index + 1));
      gameBoard.appendChild(square);
    }
  }

  function handleDeleteNumber() {
    if (chosenElement == null) {
      return;
    }

    chosenElement.textContent = "";

    const gameBoard = document.getElementById("board");
    Array.from(gameBoard.children, function (s) {
      if (s.style.backgroundColor === clickColor) {
        s.style.backgroundColor = noColor;
      }
    });
    chosenElement.style.backgroundColor = noColor;

    answer = replaceCharacter(answer,chosenElement.id-1,"0");
    localStorage.removeItem("sudoku_" + chosenElement.id);
    chosenElement = null;
    checkErrors();
    resetWin();
  }

  function checkErrors() {
    //reset
    const gameBoard = document.getElementById("board");
    Array.from(gameBoard.children, function (s) {
      s.style.backgroundColor = noColor;
    });

    for (let i = 0; i < size; i++) {
      //horizontal
      for (let j = i*size+1; j < (i+1)*size; j++) {
        let square1 = document.getElementById(String(j));
        for (let k = j+1; k < (i+1)*size+1; k++) {
          let square2 = document.getElementById(String(k));
          if (square1.textContent !== "" && square1.textContent === square2.textContent) {
            square1.style.backgroundColor = errorColor;
            square2.style.backgroundColor = errorColor;
          }
        }
      }

      //vertical
      for (let j = i+1; j < size*size; j += 9) {
        let square1 = document.getElementById(String(j));
        for (let k = j+9; k <= size*size; k += 9) {
          let square2 = document.getElementById(String(k));
          if (square1.textContent !== "" && square1.textContent === square2.textContent) {
            square1.style.backgroundColor = errorColor;
            square2.style.backgroundColor = errorColor;
          }
        }
      }

      //square
      let squareStarts = [1,4,7,28,31,34,55,58,61];
      squareStarts.forEach((i) => {
          let squares = [i, i + 1, i + 2, i + 9, i + 10, i + 11, i + 18, i + 19, i + 20];
          squares.forEach((j) => {
            let square1 = document.getElementById(String(j));
            squares.forEach((k) => {
              if (j !== k) {
                let square2 = document.getElementById(String(k));
                if (square1.textContent !== "" && square1.textContent === square2.textContent) {
                  square1.style.backgroundColor = errorColor;
                  square2.style.backgroundColor = errorColor;
                }
              }
            })
          })
      });
    }
  }

  function replaceCharacter(str, index, replacement) {
    return (
      str.slice(0, index) +
      replacement +
      str.slice(index + replacement.length)
    );
  }

  for (let i = 0; i < keys.length; i++) {
    keys[i].onclick = ({target}) => {
      const key = target.getAttribute("data-key");

      if (key === "del") {
        handleDeleteNumber();
        return;
      }

      updateSudoku(key);
    };
  }

  document.addEventListener('keydown', (event) => {
    if (event.repeat) {
      return;
    }

    const key = event.key.toLowerCase()

    if (key === "backspace") {
      handleDeleteNumber();
      return;
    }

    if (!(/^[1-9]$/i.test(event.key))) {
      return
    }

    updateSudoku(key);
  }, false);
});
