var tasks = {};

var createTask = function (taskText, taskDate, taskList) {
  // create elements that make up a task item
  var taskLi = $("<li>").addClass("list-group-item");
  var taskSpan = $("<span>")
    .addClass("badge badge-primary badge-pill")
    .text(taskDate);
  var taskP = $("<p>")
    .addClass("m-1")
    .text(taskText);

  // append span and p element to parent li
  taskLi.append(taskSpan, taskP);
  
  //check due date
  auditTask(taskLi);


  // append to ul list on the page
  $("#list-" + taskList).append(taskLi);
};

var loadTasks = function () {
  tasks = JSON.parse(localStorage.getItem("tasks"));

  // if nothing in localStorage, create a new object to track all task status arrays
  if (!tasks) {
    tasks = {
      toDo: [],
      inProgress: [],
      inReview: [],
      done: []
    };
  }

  // loop over object properties
  $.each(tasks, function (list, arr) {
    console.log(list, arr);
    // then loop over sub-array
    arr.forEach(function (task) {
      createTask(task.text, task.date, list);
    });
  });
};

var saveTasks = function () {
  localStorage.setItem("tasks", JSON.stringify(tasks));
};

//text was clicked (change p to textarea)
$(".list-group").on("click", "p", function () {
  var text = $(this).text().trim();
  //create a new text area
  var textInput = $("<textarea>").addClass("form-control").val(text);
  //swap out existing <p> element with new <textarea>
  $(this).replaceWith(textInput);

  textInput.trigger("focus");
});

//move out of text (change from textarea to p)
$(".list-group").on("blur", "textarea", function() {
  //get the textarea's current value/text
  var text = $(this).val().trim();

  //get the parent ul's id attribute
  var status = $(this).closest(".list-group").attr("id").replace("list-", "");

  //get the task's position in the list of other li elements
  var index = $(this).closest(".list-group-item").index();

  tasks[status][index].text = text;
  saveTasks();

  //recreate p element for replacement
  var taskP = $("<p>").addClass("m-1").text(text);
  //replace textarea with p element
  $(this).replaceWith(taskP);
});

//due date was clicked (turn it into a textbox)
$(".list-group").on("click", "span", function() {
  //get current text
  var date = $(this).text().trim();
  //create new input element
  var dateInput = $("<input>").attr("type", "text").addClass("form-control").val(date);
  //swap out elements
  $(this).replaceWith(dateInput);
  //enable jquery ui datepicker
  dateInput.datepicker({
    minDate: 1,
    onClose: function() {
      //when calendar is closed, force a "change" event on the dateInput
      $(this).trigger("change");
    }
  });
  //automatically focus on new element (bring up the calendar)
  dateInput.trigger("focus");
});

//value of due date was changed (revert textbox to span)
$(".list-group").on("change", "input[type='text']", function() {
  //get current text
  var date = $(this).val();
  //get the parent ul's id attribute
  var status = $(this).closest(".list-group").attr("id").replace("list-", "");
  //get the task's position in the list of other li elements
  var index = $(this).closest(".list-group-item").index();
  //update task in array and re-save to local storage
  tasks[status][index].date = date;
  console.log(date);
  saveTasks();
  //recreate span element with bootstrap classes
  var taskSpan = $("<span>").addClass("badge badge-primary badge-pill").text(date);
  //replace input with span element
  $(this).replaceWith(taskSpan);

  // Pass task's <li> element into auditTask() to check new due date
  auditTask($(taskSpan).closest(".list-group-item"));
});

// modal was triggered
$("#task-form-modal").on("show.bs.modal", function () {
  // clear values
  $("#modalTaskDescription, #modalDueDate").val("");
});

// modal is fully visible
$("#task-form-modal").on("shown.bs.modal", function () {
  // highlight textarea
  $("#modalTaskDescription").trigger("focus");
});

// save button in modal was clicked
$("#task-form-modal .btn-save").click(function () {
  // get form values
  var taskText = $("#modalTaskDescription").val();
  var taskDate = $("#modalDueDate").val();

  if (taskText && taskDate) {
    createTask(taskText, taskDate, "toDo");

    // close modal
    $("#task-form-modal").modal("hide");

    // save in tasks array
    tasks.toDo.push({
      text: taskText,
      date: taskDate
    });

    saveTasks();
  }
});

//turn columns into sortables
$(".card .list-group").sortable({
  connectWith: $(".card .list-group"),
  scroll: false,
  tolerance: "pointer",
  helper: "clone",
  activate: function(event) {
    $(this).addClass("dropover");
    $(this).addClass("bottom-trash-drag");
  },
  deactivate: function(event) {
    $(this).removeClass("dropover");
    $(this).removeClass("bottom-trash-drag");
  },
  over: function(event) {
    $(this).addClass("dropover-active");
    $(this).addClass("bottom-trash-active");
  },
  out: function(event) {
    $(this).removeClass("dropover-active");
    $(this).removeClass("bottom-trash-active");
  },
  update: function(event) {
    var tempArr = [];

    $(this).children().each(function() {
      //get text and date values of children
      var text = $(this).find("p").text().trim();
      var date = $(this).find("span").text().trim();

      //add task date to the temp array as an object (add persistence to update)
      tempArr.push({
        text: text,
        date: date
      });
    });
    console.log(tempArr);

    //trim down list's id to match object property
    var arrName = $(this).attr("id").replace("list-", "");
    //update array on tasks object and save
    tasks[arrName] = tempArr;

    saveTasks();
  }
});

// remove all tasks
$("#remove-tasks").on("click", function () {
  for (var key in tasks) {
    tasks[key].length = 0;
    $("#list-" + key).empty();
  }
  saveTasks();
});

$("#trash").droppable({
  accept: ".card .list-group-item",
  tolerance: "touch",
  drop: function(event, ui) {
    ui.draggable.remove();
  },
  over: function(event, ui) {
    console.log("over");
  },
  out: function(event, ui) {
    console.log("out");
  }
});

$("#modalDueDate").datepicker({
  minDate: 1
});

var auditTask = function(taskEl) {
  //get date from task element
  var date = $(taskEl).find("span").text().trim();
  //convert to dayjs object at 5pm
  var time = dayjs(date, "L").set('hour', 17);
  //remove any old classes from element
  $(taskEl).removeClass("list-group-item-warning list-group-item-danger");

  //apply new class if task is near/over due date
  if (dayjs().isAfter(time)) {
    $(taskEl).addClass("list-group-item-danger");
  } else if (Math.abs(dayjs().diff(time, "days")) <= 2) {
    $(taskEl).addClass("list-group-item-warning");
  }
}

setInterval(function () {
  $(".card .list-group-item").each(function(index, el) {
    auditTask(el);
  });
}, 5000);

// load tasks for the first time
loadTasks();


