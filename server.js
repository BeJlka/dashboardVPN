const Core = require("./core");

let core = new Core();

core.start().then((err) => {
  if (err) console.log("Что-то не так: ", err);
});
