//
//  6502 assembler and emulator in Javascript
//  (C)2006-2009 Stian Soreng - www.6502asm.com
//
//  Released under the GNU General Public License
//  see http://gnu.org/licenses/gpl.html
//
//  refactor by John Clark - https://github.com/inindev/6502asm
//

/*jshint bitwise: false*/
/*jshint esversion: 6 */
'use strict';


const CODE_START = 0x600;
var pc = 0x00;

var ram = new RAM(0x10000); // 64k
var cpu = new CPU6502(ram);
var display = new Display(ram);

var labelIndex = new Array();
var labelPtr = 0;

var codeLen = 0;
var codeCompiledOK = false;


               // Name,  Imm,  ZP,   ZPX,  ZPY,  ABS, ABSX, ABSY, INDX, INDY, SNGL, BRA
var opcodes = [ ["ADC", 0x69, 0x65, 0x75, 0x00, 0x6d, 0x7d, 0x79, 0x61, 0x71, 0x00, 0x00],
                ["AND", 0x29, 0x25, 0x35, 0x00, 0x2d, 0x3d, 0x39, 0x21, 0x31, 0x00, 0x00],
                ["ASL", 0x00, 0x06, 0x16, 0x00, 0x0e, 0x1e, 0x00, 0x00, 0x00, 0x0a, 0x00],
                ["BIT", 0x00, 0x24, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["BPL", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10],
                ["BMI", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x30],
                ["BVC", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x50],
                ["BVS", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x70],
                ["BCC", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x90],
                ["BCS", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xb0],
                ["BNE", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0],
                ["BEQ", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0],
                ["CMP", 0xc9, 0xc5, 0xd5, 0x00, 0xcd, 0xdd, 0xd9, 0xc1, 0xd1, 0x00, 0x00],
                ["CPX", 0xe0, 0xe4, 0x00, 0x00, 0xec, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["CPY", 0xc0, 0xc4, 0x00, 0x00, 0xcc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["DEC", 0x00, 0xc6, 0xd6, 0x00, 0xce, 0xde, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["EOR", 0x49, 0x45, 0x55, 0x00, 0x4d, 0x5d, 0x59, 0x41, 0x51, 0x00, 0x00],
                ["CLC", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x00],
                ["SEC", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x38, 0x00],
                ["CLI", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x58, 0x00],
                ["SEI", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x78, 0x00],
                ["CLV", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xb8, 0x00],
                ["CLD", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd8, 0x00],
                ["SED", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf8, 0x00],
                ["INC", 0x00, 0xe6, 0xf6, 0x00, 0xee, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["JMP", 0x00, 0x00, 0x00, 0x00, 0x4c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["JSR", 0x00, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["LDA", 0xa9, 0xa5, 0xb5, 0x00, 0xad, 0xbd, 0xb9, 0xa1, 0xb1, 0x00, 0x00],
                ["LDX", 0xa2, 0xa6, 0x00, 0xb6, 0xae, 0x00, 0xbe, 0x00, 0x00, 0x00, 0x00],
                ["LDY", 0xa0, 0xa4, 0xb4, 0x00, 0xac, 0xbc, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["LSR", 0x00, 0x46, 0x56, 0x00, 0x4e, 0x5e, 0x00, 0x00, 0x00, 0x4a, 0x00],
                ["NOP", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xea, 0x00],
                ["ORA", 0x09, 0x05, 0x15, 0x00, 0x0d, 0x1d, 0x19, 0x01, 0x11, 0x00, 0x00],
                ["TAX", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xaa, 0x00],
                ["TXA", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x8a, 0x00],
                ["DEX", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xca, 0x00],
                ["INX", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe8, 0x00],
                ["TAY", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xa8, 0x00],
                ["TYA", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x98, 0x00],
                ["DEY", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88, 0x00],
                ["INY", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc8, 0x00],
                ["ROR", 0x00, 0x66, 0x76, 0x00, 0x6e, 0x7e, 0x00, 0x00, 0x00, 0x6a, 0x00],
                ["ROL", 0x00, 0x26, 0x36, 0x00, 0x2e, 0x3e, 0x00, 0x00, 0x00, 0x2a, 0x00],
                ["RTI", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00],
                ["RTS", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x60, 0x00],
                ["SBC", 0xe9, 0xe5, 0xf5, 0x00, 0xed, 0xfd, 0xf9, 0xe1, 0xf1, 0x00, 0x00],
                ["STA", 0x00, 0x85, 0x95, 0x00, 0x8d, 0x9d, 0x99, 0x81, 0x91, 0x00, 0x00],
                ["TXS", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x9a, 0x00],
                ["TSX", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xba, 0x00],
                ["PHA", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x48, 0x00],
                ["PLA", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x68, 0x00],
                ["PHP", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00],
                ["PLP", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x28, 0x00],
                ["STX", 0x00, 0x86, 0x00, 0x96, 0x8e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["STY", 0x00, 0x84, 0x94, 0x00, 0x8c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                ["---", 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] ];

// init
document.getElementById("compileButton").disabled = false;
document.getElementById("runButton").disabled = true;
document.getElementById("hexdumpButton").disabled = true;
document.getElementById("fileSelect").disabled = false;
document.addEventListener("keypress", keyPress, true);

// reset everything
reset();

// random number generator at ZP $fe
ram.read_hook(0x00fe, 0x00fe, function(addr) {
    return Math.floor(Math.random() * 256);
});

// store keycode in ZP $ff
function keyPress(e) {
    if(typeof window.event != "undefined") {
        e = window.event; // IE fix
    }
    if(e.type == "keypress") {
        var value = e.which;
        ram.write(0xff, value);
    }
}

// disables the Run and Debug buttons when text is altered in the code editor
function disableButtons() {
    document.getElementById("runButton").disabled = true;
    document.getElementById("hexdumpButton").disabled = true;
    document.getElementById("fileSelect").disabled = false;
    document.getElementById("compileButton").disabled = false;
    document.getElementById("runButton").value = "Run";
    codeCompiledOK = false;
// TODO
//    codeRunning = false;
    document.getElementById("code").focus();
}

// loads a file from server
function load(file) {
    reset();
    disableButtons();
    document.getElementById("code").value = "loading, please wait...";
    document.getElementById("compileButton").disabled = true;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if(xhr.readyState == 4) {
            if(xhr.status == 200) {
                document.getElementById("code").value = xhr.responseText;
                document.getElementById("compileButton").disabled = false;
            }
        }
    };
    xhr.open("GET", "examples/" + file);
    xhr.send(null);
}

// reset CPU and memory
function reset() {
    ram.reset();
    pc = CODE_START;
    cpu.reset();
}

// prints text in the message window
function message(text) {
    var obj = document.getElementById("messages");
    obj.innerHTML += text + "<br />";
    obj.scrollTop = obj.scrollHeight;
}

//
// compiles code into memory array
//
function compileCode() {
    reset();
    document.getElementById("messages").innerHTML = "";

    var code = document.getElementById("code").value;
    code += "\n\n";
    var lines = code.split("\n");
    codeCompiledOK = true;
    labelIndex = new Array();
    labelPtr = 0;

    message("indexing labels...");

    pc = CODE_START;

    for(var xc=0; xc<lines.length; xc++) {
        if(!indexLabels(lines[xc])) {
            message("<b>label already defined at line "+(xc+1)+":</b> "+lines[xc]);
            return false;
        }
    }

    var str = "found " + labelIndex.length + " label";
    if(labelIndex.length != 1) str += "s";
    message(str);

    pc = CODE_START;

    message("compiling code...");

    var x;
    for(x=0; x<lines.length; x++) {
        if(!compileLine(lines[x], x)) {
            codeCompiledOK = false;
            break;
        }
    }

    if(codeLen == 0) {
        codeCompiledOK = false;
        message("no code to run");
    }

    if(codeCompiledOK) {
        document.getElementById("runButton").disabled = false;
        document.getElementById("hexdumpButton").disabled = false;
        document.getElementById("compileButton").disabled = true;
        document.getElementById("fileSelect").disabled = false;
        ram.write(pc, 0x00);
    } else {
        str = lines[x].replace("<", "&lt;").replace(">", "&gt;");
        message("<b>syntax error - line " + (x+1) + ": " + str + "</b>");
        document.getElementById("runButton").disabled = true;
        document.getElementById("compileButton").disabled = false;
        document.getElementById("fileSelect").disabled = false;
        return;
    }

//    updateDisplayFull();
    message("code compiled successfully: " + codeLen + " bytes");
}

//
// pushes all labels to array
//
function indexLabels(input) {
    // remove comments
    input = input.replace(new RegExp(/^(.*?);.*/), "$1");

    // trim line
    input = input.replace(new RegExp(/^\s+/), "");
    input = input.replace(new RegExp(/\s+$/), "");

    // figure out how many bytes this instuction takes
    var thisPC = pc;

    codeLen = 0;
    compileLine(input);

    // find command or label
    if(input.match(new RegExp(/^\w+:/))) {
        var label = input.replace(new RegExp(/(^\w+):.*$/), "$1");
        return pushLabel(label + "|" + thisPC);
    }

    return true;
}

//
// push label to array
//   returns false if label already exists
//
function pushLabel(name) {
    if(findLabel(name)) return false;
    labelIndex[labelPtr++] = name + "|";
    return true;
}

//
// returns true if label exists
//
function findLabel(name) {
    for(var i=0; i<labelIndex.length; i++) {
        var nameAndAddr = labelIndex[i].split("|");
        if(name == nameAndAddr[0]) {
            return true;
        }
    }
    return false;
}

//
// associates label with address
//
function setLabelPC(name, addr) {
    for(var i=0; i<labelIndex.length; i++) {
        var nameAndAddr = labelIndex[i].split("|");
        if(name == nameAndAddr[0]) {
            labelIndex[i] = name + "|" + addr;
            return true;
        }
    }
    return false;
}

//
// get address associated with label
//
function getLabelPC(name) {
    for(var i=0; i<labelIndex.length; i++) {
        var nameAndAddr = labelIndex[i].split("|");
        if(name == nameAndAddr[0]) {
            return (nameAndAddr[1]);
        }
    }
    return -1;
}

//
// compiles one line of code
//   returns true if it compiled successfully
//
function compileLine(input, lineno) { // TODO: lineno not used
    // remove comments
    input = input.replace(new RegExp(/^(.*?);.*/), "$1");

    // trim line
    input = input.replace(new RegExp(/^\s+/), "");
    input = input.replace(new RegExp(/\s+$/), "");

    // find command or label
    var command = "";
    if(input.match(new RegExp(/^\w+:/))) {
// TODO: is label not used?
//        label = input.replace(new RegExp(/(^\w+):.*$/), "$1");
        if(input.match(new RegExp(/^\w+:[\s]*\w+.*$/))) {
            input = input.replace(new RegExp(/^\w+:[\s]*(.*)$/), "$1");
            command = input.replace(new RegExp(/^(\w+).*$/), "$1");
        } else {
            command = "";
        }
    } else {
        command = input.replace(new RegExp(/^(\w+).*$/), "$1");
    }

    // blank line?
    if(command == "")
        return true;

    command = command.toUpperCase();

    var param = "";
    if(input.match(/^\*[\s]*=[\s]*[\$]?[0-9a-f]*$/)) {
        // equ spotted
        var addr = -1;
        param = input.replace(new RegExp(/^[\s]*\*[\s]*=[\s]*/), "");
        if(param[0] == "$") {
            param = param.replace(new RegExp(/^\$/), "");
            addr = parseInt(param, 16);
        } else {
            addr = parseInt(param, 10);
        }
        if((addr < 0) || (addr > 0xffff)) {
            message("unable to relocate code outside 64k memory");
            return false;
        }
        pc = addr;
        return true;
    }

    if(input.match(/^\w+\s+.*?$/)) {
        param = input.replace(new RegExp(/^\w+\s+(.*?)/), "$1");
    } else {
        if(input.match(/^\w+$/)) {
            param = "";
        } else {
            return false;
        }
    }

    param = param.replace(/[ ]/g, "");

    if(command == "DCB")
        return DCB(param);

    for(var o=0; o<opcodes.length; o++) {
        if(opcodes[o][0] == command) {
            if(checkSingle(param, opcodes[o][10])) return true;
            if(checkImmediate(param, opcodes[o][1])) return true;
            if(checkZeroPage(param, opcodes[o][2])) return true;
            if(checkZeroPageX(param, opcodes[o][3])) return true;
            if(checkZeroPageY(param, opcodes[o][4])) return true;
            if(checkAbsoluteX(param, opcodes[o][6])) return true;
            if(checkAbsoluteY(param, opcodes[o][7])) return true;
            if(checkIndirectX(param, opcodes[o][8])) return true;
            if(checkIndirectY(param, opcodes[o][9])) return true;
            if(checkAbsolute(param, opcodes[o][5])) return true;
            if(checkBranch(param, opcodes[o][11])) return true;
        }
    }

    return false; // unknown opcode
}

/*****************************************************************************
 ****************************************************************************/

function DCB(param) {
    var values = param.split(",");
    if(values.length == 0) return false;
    for(var v=0; v<values.length; v++) {
        var str = values[v];
        if(str != undefined && str != null && str.length > 0) {
            var ch = str.substring(0, 1);
            var number = 0;
            if(ch == "$") {
                number = parseInt(str.replace(/^\$/, ""), 16);
                pushByte(number);
            } else if(ch >= "0" && ch <= "9") {
                number = parseInt(str, 10);
                pushByte(number);
            } else {
                return false;
            }
        }
    }
    return true;
}

//
// commom branch function for all branches (BCC, BCS, BEQ, BNE..)
//
function checkBranch(param, opcode) {
    if(opcode == 0x00) return false;

    var addr = -1;
    if(param.match(/\w+/))
        addr = getLabelPC(param);
    if(addr == -1) { pushWord(0x00); return false; }
    pushByte(opcode);
    if(addr < (pc-0x600)) {    // Backwards?
        pushByte((0xff - ((pc-0x600)-addr)) & 0xff);
        return true;
    }
    pushByte((addr-(pc-0x600)-1) & 0xff);
    return true;
}

//
// check if param is immediate and push value
//
function checkImmediate(param, opcode) {
    if(opcode == 0x00) return false;

    if(param.match(new RegExp(/^#\$[0-9a-f]{1,2}$/i))) {
        pushByte(opcode);
        let value = parseInt(param.replace(/^#\$/, ""), 16);
        if(value < 0 || value > 255) return false;
        pushByte(value);
        return true;
    }
    if(param.match(new RegExp(/^#[0-9]{1,3}$/i))) {
        pushByte(opcode);
        let value = parseInt(param.replace(/^#/, ""), 10);
        if(value < 0 || value > 255) return false;
        pushByte(value);
        return true;
    }
    // label lo/hi
    if(param.match(new RegExp(/^#[<>]\w+$/))) {
        let label = param.replace(new RegExp(/^#[<>](\w+)$/), "$1");
        let hilo = param.replace(new RegExp(/^#([<>]).*$/), "$1");
        pushByte(opcode);
        if(findLabel(label)) {
            let addr = getLabelPC(label);
            switch(hilo) {
                case ">":
                    pushByte((addr >> 8) & 0xff);
                    return true;
                case "<":
                    pushByte(addr & 0xff);
                    return true;
                default:
                    return false;
            }
        } else {
            pushByte(0x00);
            return true;
        }
    }
    return false;
}

//
// checkIndZP() - check indirect ZP
//


//
// checkIndirectX() - check if param is indirect X and push value
//
function checkIndirectX(param, opcode) {
    if(opcode == 0x00) return false;
    if(param.match(/^\(\$[0-9a-f]{1,2},X\)$/i)) {
        pushByte(opcode);
        var value = param.replace(new RegExp(/^\(\$([0-9a-f]{1,2}).*$/i), "$1");
        if(value < 0 || value > 255) return false;
        pushByte(parseInt(value, 16));
        return true;
    }
    return false;
}

//
// checkIndirectY() - check if param is indirect Y and push value
//
function checkIndirectY(param, opcode) {
    if(opcode == 0x00) return false;
    if(param.match(/^\(\$[0-9a-f]{1,2}\),Y$/i)) {
        pushByte(opcode);
        var value = param.replace(new RegExp(/^\([\$]([0-9a-f]{1,2}).*$/i), "$1");
        if(value < 0 || value > 255) return false;
        pushByte(parseInt(value, 16));
        return true;
    }
    return false;
}

//
//    checkSingle() - single-byte opcodes
//
function checkSingle(param, opcode) {
    if(opcode == 0x00) return false;
    if(param != "") return false;
    pushByte(opcode);
    return true;
}

//
// checkZeroaPage() - check if param is ZP and push value
//
function checkZeroPage(param, opcode) {
    if(opcode == 0x00) return false;

    if(param.match(/^\$[0-9a-f]{1,2}$/i)) {
        pushByte(opcode);
        let value = parseInt(param.replace(/^\$/, ""), 16);
        if(value < 0 || value > 255) return false;
        pushByte(value);
        return true;
    }
    if(param.match(/^[0-9]{1,3}$/i)) {
        pushByte(opcode);
        let value = parseInt(param, 10);
        if(value < 0 || value > 255) return false;
        pushByte(value);
        return true;
    }
    return false;
}

//
// checkAbsoluteX() - check if param is ABSX and push value
//
function checkAbsoluteX(param, opcode) {
    if(opcode == 0x00) return false;
    if(param.match(/^\$[0-9a-f]{3,4},X$/i)) {
        pushByte(opcode);
        var number = param.replace(new RegExp(/^\$([0-9a-f]*),X/i), "$1");
        var value = parseInt(number, 16);
        if(value < 0 || value > 0xffff) return false;
        pushWord(value);
        return true;
    }

    if(param.match(/^\w+,X$/i)) {
        param = param.replace(new RegExp(/,X$/i), "");
        pushByte(opcode);
        if(findLabel(param)) {
            var addr = getLabelPC(param);
            if(addr < 0 || addr > 0xffff) return false;
            pushWord(addr);
            return true;
        } else {
            pushWord(0x1234);
            return true;
        }
    }

    return false;
}

//
// checkAbsoluteY() - check if param is ABSY and push value
//
function checkAbsoluteY(param, opcode) {
    if(opcode == 0x00) return false;
    if(param.match(/^\$[0-9a-f]{3,4},Y$/i)) {
        pushByte(opcode);
        var number = param.replace(new RegExp(/^\$([0-9a-f]*),Y/i), "$1");
        var value = parseInt(number, 16);
        if(value < 0 || value > 0xffff) return false;
        pushWord(value);
        return true;
    }

    // it could be a label too...
    if(param.match(/^\w+,Y$/i)) {
        param = param.replace(new RegExp(/,Y$/i), "");
        pushByte(opcode);
        if(findLabel(param)) {
            var addr = getLabelPC(param);
            if(addr < 0 || addr > 0xffff) return false;
            pushWord(addr);
            return true;
        } else {
            pushWord(0x1234);
            return true;
        }
    }
    return false;
}

//
// checkZeroPageX() - check if param is ZPX and push value
//
function checkZeroPageX(param, opcode) {
    if(opcode == 0x00) return false;

    if(param.match(/^\$[0-9a-f]{1,2},X/i)) {
        pushByte(opcode);
        let number = param.replace(new RegExp(/^\$([0-9a-f]{1,2}),X/i), "$1");
        let value = parseInt(number, 16);
        if(value < 0 || value > 255) return false;
        pushByte(value);
        return true;
    }
    if(param.match(/^[0-9]{1,3},X/i)) {
        pushByte(opcode);
        let number = param.replace(new RegExp(/^([0-9]{1,3}),X/i), "$1");
        let value = parseInt(number, 10);
        if(value < 0 || value > 255) return false;
        pushByte(value);
        return true;
    }
    return false;
}

//
// checkZeroPageY() - check if param is ZPY and push value
//
function checkZeroPageY(param, opcode) {
    if(opcode == 0x00) return false;
    if(param.match(/^\$[0-9a-f]{1,2},Y/i)) {
        pushByte(opcode);
        let number = param.replace(new RegExp(/^\$([0-9a-f]{1,2}),Y/i), "$1");
        let value = parseInt(number, 16);
        if(value < 0 || value > 255) return false;
        pushByte(value);
        return true;
    }
    if(param.match(/^[0-9]{1,3},Y/i)) {
        pushByte(opcode);
        let number = param.replace(new RegExp(/^([0-9]{1,3}),Y/i), "$1");
        let value = parseInt(number, 10);
        if(value < 0 || value > 255) return false;
        pushByte(value);
        return true;
    }
    return false;
}

//
// checkAbsolute() - check if param is ABS and push value
//
function checkAbsolute(param, opcode) {
    if(opcode == 0x00) return false;
    pushByte(opcode);
    if(param.match(/^\$[0-9a-f]{3,4}$/i)) {
        let value = parseInt(param.replace(/^\$/, ""), 16);
        if(value < 0 || value > 0xffff) return false;
        pushWord(value);
        return true;
    }
    // it could be a label too...
    if(param.match(/^\w+$/)) {
        if(findLabel(param)) {
            let addr = (getLabelPC(param));
            if(addr < 0 || addr > 0xffff) return false;
            pushWord(addr);
            return true;
        } else {
            pushWord(0x1234);
            return true;
        }
    }
    return false;
}

//
// pushByte() - push byte into memory
//
function pushByte(value) {
    ram.write(pc, value);
    pc++;
    codeLen++;
}

//
// pushWord() - push a word using pushByte twice
//
function pushWord(value) {
    pushByte(value);
    pushByte(value >> 8);
}

//
// hexDump() - dump binary as hex to new window
//
function hexDump() {
    var w = window.open('', 'hexdump', 'width=610,height='+(codeLen>450?800:400)+',resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no,status=no');

    var html = "<html><head>";
    html += "<link href='style.css' rel='stylesheet' type='text/css' />";
    html += "<title>hexdump</title></head>";
    html += "<body><pre>";
    html += ram.hexdump(CODE_START, CODE_START+codeLen-1, true);
    html += "</pre></body></html>";

    w.document.write(html);
    w.document.close();
}
