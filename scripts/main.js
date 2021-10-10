let apikey = "FLNFOHIK3YIKP4JI";
let apiTicker = "";
let quantityStock = 0;
let companyName = "";
let data_temporal_resolutions = 'Daily'; //Daily
let input_dataset = [];
let result = [];
let data_raw = [];
let sma_vec = [];  //create function to compute sma
let window_size = 60;  //60
let trainingsize = 97; //97
let n_epochs = 3; //10
let learningrate = 0.01; //0.01
let n_hiddenlayers = 4; //4

let arr_name = [];
let arr_comp = [];
let arr_quant = [];
let arr_price = [];
let arr_predprice = [];

let rate_a = 1.03;
let rate_b = 0.9;

let n_rows = 0;

function getStockData() {

  apiTicker = document.getElementById('input_stockname').value;
  if (apiTicker.length == 0) {
    alert("Please enter Ticker name");
    return;
  }
  quantityStock = document.getElementById("input_stock_quantity").value;
  if (quantityStock.length == 0 || quantityStock <= 0) {
    alert("Please enter a number greater than 0");
    return;
  }
  if (arr_name.includes(apiTicker.toUpperCase())) {
    alert("Company already added!");
    return;
  }

  let btnAddStock = document.getElementById('add_stock');
  btnAddStock.style.display = "none";

  let btnFindResult = document.getElementById('find_result');
  btnFindResult.style.display = "none";

  let progressBar = document.getElementById('progress');
  let labelProgressBar = document.getElementById('progress_label');

  let requestURL = "";

  let URLTickerSearch = "https://financialmodelingprep.com/api/v3/search?query=" + apiTicker + "&limit=10&exchange=NASDAQ&apikey=" + "02dcff5344d9f577207a78d65f354764";

  if (data_temporal_resolutions == 'Daily') { //daily
    requestURL = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=" + apiTicker + "&outputsize=full&apikey=" + apikey;
  } else { //weekly     //add condition to check apiTicker
    requestURL = "https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=" + apiTicker + "&outputsize=full&apikey=" + apikey;
  }

  console.log("step 1 clear");
  $.getJSON(requestURL, function (data) {
    console.log("step 2 clear");

    let daily = [];
    if (data_temporal_resolutions == 'Daily') {
      daily = data['Time Series (Daily)'];
    } else {
      daily = data['Weekly Adjusted Time Series'];
    }

    console.log(daily);

    if (daily != undefined) {

      let symbol = data['Meta Data']['2. Symbol'];
      let last_refreshed = data['Meta Data']['3. Last Refreshed'];

      data_raw = [];
      sma_vec = [];

      console.log("hey2");

      for (let date in daily) {
        data_raw.push({ timestamp: date, price: parseFloat(daily[date]['5. adjusted close']) });
      }

      console.log(data_raw.length);

      data_raw = data_raw.slice(0, Math.round(0.35 * data_raw.length));

      data_raw.reverse();

      console.log("hey2");

      if (data_raw.length < 1) {
        alert("Invalid Ticker");
        btnAddStock.style.display = "initial";
        if (n_rows > 0) {
          btnFindResult.style.display = "initial";
        }
        return;
      }

      let message = "Symbol: " + symbol + " (last refreshed " + last_refreshed + ")";

      console.log(message);

      sma_vec = calculateSMA(data_raw, window_size);

      if (sma_vec.length < 32) {
        alert("Insufficient Data about Stock");
        btnAddStock.style.display = "initial";
        if (n_rows > 0) {
          btnFindResult.style.display = "initial";
        }
        return;
      }


      let sma = sma_vec.map(function (val) {
        return val['avg'];
      });

      let prices = data_raw.map(function (val) {
        return val['price'];
      });

      let timestamps_a = data_raw.map(function (val) {
        return val['timestamp'];
      });

      let timestamps_b = data_raw.map(function (val) {
        return val['timestamp'];
      }).splice(window_size, data_raw.length);

      console.log("step 3 clear");

      labelProgressBar.style.display = "initial";
      progressBar.style.display = "initial";

      onClickTrainModel();
    }
    else {
      alert("Invalid Ticker");
      btnAddStock.style.display = "initial";
      if (n_rows > 0) {
        btnFindResult.style.display = "initial";
      }
      return;
    }
  });

  $.getJSON(URLTickerSearch, function (data) {

    companyName = data[0]['name'];
    console.log(companyName);

  });

}

function calculateSMA(data, window_size) {
  let r_avgs = [], avg_prev = 0;
  for (let i = 0; i <= data.length - window_size; i++) {
    let curr_avg = 0.00, t = i + window_size;
    for (let k = i; k < t && k <= data.length; k++) {
      curr_avg += data[k]['price'] / window_size;
    }
    r_avgs.push({ set: data.slice(i, i + window_size), avg: curr_avg });
    avg_prev = curr_avg;
  }
  return r_avgs;
}

async function onClickTrainModel() {

  let progressBar = document.getElementById('progress');
  let labelProgressBar = document.getElementById('progress_label');

  console.log("step 5 clear");

  let epoch_loss = [];

  let inputs = sma_vec.map(function (inp_f) {
    return inp_f['set'].map(function (val) {
      return val['price'];
    })
  });
  //console.log("inputs: ");
  //console.log(inputs.length);

  let outputs = sma_vec.map(function (outp_f) {
    return outp_f['avg'];
  });

  inputs = inputs.slice(0, Math.floor(trainingsize / 100 * inputs.length));
  outputs = outputs.slice(0, Math.floor(trainingsize / 100 * outputs.length));

  let callback = function (epoch, log) {
    /*let logHtml = document.getElementById("debug para").innerHTML;
    logHtml = "<div>Epoch: " + (epoch + 1) + " (of " + n_epochs + ")" +
      ", loss: " + log.loss +
      ", difference: " + (epoch_loss[epoch_loss.length - 1] - log.loss) +
      "</div>" + logHtml;*/
    var prog = ((epoch + 1) / n_epochs) * 100;
    progressBar.value = prog.toString();
    epoch_loss.push(log.loss);
  }
  console.log("step 6 clear");

  let result = await trainModel(inputs, outputs, window_size, n_epochs, learningrate, n_hiddenlayers, callback);

  console.log("model training completed");

  inputs = sma_vec.map(function (inp_f) {
    return inp_f['set'].map(function (val) { return val['price']; });
  });
  let pred_X = [inputs[inputs.length - 1]];
  pred_X = pred_X.slice(Math.floor(trainingsize / 100 * pred_X.length), pred_X.length);

  let pred_y = makePredictions(pred_X, result['model'], result['normalize']);

  pred_y = rate_a * pred_y;

  pred_y = pred_y - rate_b * (pred_y - data_raw[data_raw.length - 1]['price']);

  pred_y = Math.round((pred_y + Number.EPSILON) * 100) / 100;

  console.log("onClickPredict(): pred_y");
  console.log(pred_y);

  arr_name.push(apiTicker.toUpperCase());
  arr_quant.push(quantityStock);
  arr_comp.push(companyName);
  arr_price.push(data_raw[data_raw.length - 1]['price']);
  arr_predprice.push(pred_y);
  n_rows++;

  setTable();

  labelProgressBar.style.display = "none";
  progressBar.style.display = "none";
  progressBar.value = "0";

  let btnAddStock = document.getElementById('add_stock');
  btnAddStock.style.display = "initial";

  document.getElementById('input_stockname').value = "";
  document.getElementById("input_stock_quantity").value = 1;

  //document.getElementById('predicted_price').innerHTML="The price is $"+pred_y;

}

function formatDate(date) {
  var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

function setTable() {
  var table = document.getElementById("portfolio_table");
  if (n_rows < 1) {
    table.style.display = "none";
  }
  else {
    table.style.display = "initial";
  }

  console.log("setTable: " + n_rows);


  var row = table.insertRow(table.rows.length);
  var temp_col = row.insertCell(0);
  var stockname = row.insertCell(1);
  stockname.innerHTML = arr_name[n_rows - 1];
  var stockcomp = row.insertCell(2);
  stockcomp.innerHTML = arr_comp[n_rows - 1];
  var stockquantity = row.insertCell(3);
  stockquantity.innerHTML = arr_quant[n_rows - 1].toString();
  var stockprice = row.insertCell(4);
  stockprice.innerHTML = "$" + arr_price[n_rows - 1].toString();
  var stockprice_predict = row.insertCell(5);
  stockprice_predict.innerHTML = "$" + arr_predprice[n_rows - 1];
  stockprice_predict.style.fontFamily = "Lato, sans-serif";
  stockprice_predict.style.color = "rgba(48, 70, 89, 0.8)"; //--dark80

  apiTicker = "";
  quantityStock = 0;

  let btnFindResult = document.getElementById('find_result');
  if (n_rows > 0) {
    btnFindResult.style.display = "initial";
  } else {
    btnFindResult.style.display = "none";
  }
}

function findTotalResult() {
  let sum = 0.0;
  let textResult = document.getElementById('result_text');
  let priceResult = document.getElementById('result_price');

  let btnAddStock = document.getElementById('add_stock');
  btnAddStock.style.display = "none";
  document.getElementById('find_result').style.display = "none";

  for (var i = 0; i < n_rows; i++) {
    let dif = arr_predprice[i] - arr_price[i];
    sum += arr_quant[i] * dif;
  }
  sum = Math.round((sum + Number.EPSILON) * 100) / 100
  if (sum > 0) {
    textResult.innerHTML = "Total Profit ";
    priceResult.innerHTML = "$" + sum.toString();
    priceResult.style.color = "green";
  } else if (sum == 0) {
    textResult.innerHTML = "You broke even!";
    priceResult.style.color = "#183650";
  } else {
    textResult.innerHTML = "Total Loss ";
    priceResult.innerHTML = "$" + (sum * (-1)).toString();
    priceResult.style.color = "red";
  }

  document.getElementById('restart_portfolio').style.display = "initial";
}

function restartPortfolio() {
  arr_name = [];
  arr_quant = [];
  arr_price = [];
  arr_predprice = [];
  n_rows = 0;
  document.getElementById('restart_portfolio').style.display = "none";
  document.getElementById("portfolio_table").style.display = "none";
  document.getElementById('add_stock').style.display = "initial";
  document.getElementById('input_stockname').value = "";
  document.getElementById("input_stock_quantity").value = 1;
}
