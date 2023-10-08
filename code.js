function main() {
    //バッククオートの間にシフトボードの共有で生成されるテキストを貼り付ける。「バイト先の表示」は有効でも無効でもよい。
    const text = ``
    const shouldDeleteEvent = true //【true推奨】textに記述されている最初と最後の日付の範囲内で既にこのプログラムによって登録されているカレンダーのイベントを削除するかどうか。

    //実行
    setShift(createShiftsArray(text), shouldDeleteEvent)
}


/**
 * シフトボードの共有機能から生成された、シフト情報を含むテキストから、各日のシフトデータをオブジェクト化しそれを要素とする配列を生成する。
 * テキストの1行目の日付がコード実行時の年の日付として処理を行う。
 * 12月から1月の範囲のテキストの場合、12月は今年、1月は来年のシフトとして処理する。
 *
 * @param {string} text - シフトボードが生成したテキスト
 * @returns {Array<Object>}
 */
function createShiftsArray(text) {
    const splittedTextArray = text.split(/\r\n|\n|\r/g)//改行でsplit

    //テキストの(mm/dd（D）hh:mm - hh:mm)にマッチする正規表現
    const dateRegExp = new RegExp('^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])（[月|火|水|木|金|土|日]）([01][0-9]|2[0-3]):[0-5][0-9]\\s-\\s([01][0-9]|2[0-3]):[0-5][0-9]$')
    let isWorkplaceIncluded
    if (dateRegExp.test(splittedTextArray[1]) || splittedTextArray[1] === '') {
        //2行目にシフトの日付が入っているまたは2行目が空行の場合は「バイト先の表示」の設定はオフ
        isWorkplaceIncluded = 0
    } else {
        //「バイト先の表示」の設定がオン
        isWorkplaceIncluded = 1
    }

    const thisYear = new Date().getFullYear()//今年を取得
    const startMonth = parseInt(splittedTextArray[0].slice(0, 2))//1行目の最初の二文字（月）を取得し整数にする。
    //シフトの日時情報を、各日ごとに処理し、オブジェクトを生成する。
    //「バイト先の表示」の設定が有効の場合、バイト名の要素は飛ばして処理を行う。
    let shifts = []
    for (let i = 0; splittedTextArray[i] !== ''; i += 1 + isWorkplaceIncluded) {
        let year//セットする年
        //最も早い日付の月よりも小さい値なら、来年を指定する。
        if (parseInt(splittedTextArray[i].slice(0, 2)) < startMonth) year = thisYear + 1
        else year = thisYear

        //月と日をそれぞれ変数に代入する。
        const [month, date] = splittedTextArray[i].match(/(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])/, 'g')[0].split("/").map(item => parseInt(item))

        //開始時刻と終了時刻を、それぞれ時間と分に分けて変数に代入する。
        const [startTimes, endTimes] = splittedTextArray[i].match(/([01][0-9]|2[0-3]):[0-5][0-9]/g)
        const [startHours, startMinutes] = startTimes.split(":").map(item => parseInt(item))
        const [endHours, endMinutes] = endTimes.split(":").map(item => parseInt(item))

        //「バイト先の表示」が有効であれば、バイト先の名前を変数に代入する。
        let workplaceName
        if (isWorkplaceIncluded) {
            workplaceName = splittedTextArray[i + 1].slice(splittedTextArray[i + 1].indexOf('- ') + 2)
        } else {
            workplaceName = 'バイト'
        }

        //オブジェクトの作製
        const shift = {
            startDate: new Date(year, month - 1, date, startHours, startMinutes),
            endDate: new Date(year, month - 1, date, endHours, endMinutes),
            workplace: workplaceName
        }
        shifts.push(shift)
    }
    return shifts
}

/**
 * genShiftsFromShiftboardTextで生成した、シフト情報のオブジェクトを要素とする配列を、Googleカレンダーに登録する。
 * カレンダーIDはスクリプトプロパティに「CALENDAR_ID」というキーで保存する必要がある。
 * @param {Array<Object>} shifts - createShiftsFromShiftboardText関数で作製された配列
 * @param {shouldCurrentEvent} shouldDeleteEvent - shiftsで登録するシフトの最初の日付から最後の日付までの間に、既に登録されているシフト情報を削除するかどうか。デフォルトはtrue
 */
function setShift(shifts, shouldDeleteEvent = true) {
    const CALENDAR_ID = PropertiesService.getScriptProperties().getProperty("CALENDAR_ID")
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID)

    const credit = 'Created By GAS'
    //登録済みのシフト情報を削除する場合に、このコードによって登録されたイベントを削除する。
    if (shouldDeleteEvent) {
        const events = calendar.getEvents(shifts[0].startDate, shifts[shifts.length - 1].endDate)
        const filteredEvents = events.filter(event => event.getDescription().indexOf(credit) !== -1)
        for (const event of filteredEvents) event.deleteEvent()
    }

    for (const shift of shifts) {
        calendar.createEvent(`${shift.workplace}`, shift.startDate, shift.endDate, { description: credit })
    }
}