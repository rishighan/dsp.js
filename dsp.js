/*  
 *  DSP.js - a comprehensive digital signal processing  library for javascript 
 *  
 *  Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
 *  Copyright 2010 Corban Brook. All rights reserved.
 *
 */


/**
 * DSP is an object which contains general purpose utility functions and contants
 */
DSP = {};

/**
 * Inverts the phase of a signal
 *
 * @param   {Array} buffer A sample buffer
 *
 * @returns The inverted sample buffer
 */
DSP.invert = function(buffer) {
  for ( var i = 0, len = buffer.length; i < len; i++ ) {
    buffer[i] *= -1;
  }

  return buffer;
};

/** Waveforms */
DSP.SINE     = 1;
DSP.TRIANGLE = 2;
DSP.SAW      = 3;
DSP.SQUARE   = 4;

/** Filters */
DSP.LOWPASS  = 0;
DSP.HIGHPASS = 1;
DSP.BANDPASS = 2;
DSP.NOTCH    = 3;

/** Window functions */
DSP.BARTLETT     =  1;
DSP.BARTLETTHANN =  2;
DSP.BLACKMAN     =  3;
DSP.COSINE       =  4;
DSP.GAUSS        =  5;
DSP.HAMMING      =  6;
DSP.HANN         =  7;
DSP.LANCZOS      =  8;
DSP.RECTANGULAR  =  9;
DSP.TRIANGULAR   = 10;

/** Math */
DSP.TWO_PI = 2*Math.PI;

/** 
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 *
 * @param   {Number} bufferSize The size of the sample buffer to be computed
 * @param   {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
DFT = function(bufferSize, sampleRate) {
  this.bufferSize = bufferSize;
  this.sampleRate = sampleRate;

  var N = bufferSize/2 * bufferSize;
      
  this.sinTable = new Float32Array(N);
  this.cosTable = new Float32Array(N);
  
  for ( var i = 0; i < N; i++ ) {
    this.sinTable[i] = Math.sin(i * DSP.TWO_PI / bufferSize);
    this.cosTable[i] = Math.cos(i * DSP.TWO_PI / bufferSize);
  }
  
  this.spectrum = new Float32Array(bufferSize/2);
  this.complexValues = new Float32Array(bufferSize/2);
};

/**
 * Performs a forward tranform on the sample buffer. 
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param   {Array} buffer The sample buffer
 *
 * @returns The frequency spectrum array
 */
DFT.prototype.forward = function(buffer) {
  var real, imag;

  for ( var k = 0; k < this.bufferSize/2; k++ ) {
    real = 0.0;
    imag = 0.0;

    for ( var n = 0; n < buffer.length; n++ ) {
      real += this.cosTable[k*n] * signal[n];
      imag += this.sinTable[k*n] * signal[n];
    }

    this.complexValues[k] = {real: real, imag: imag};
  }
  
  for ( var i = 0; i < this.bufferSize/2; i++ ) {
    this.spectrum[i] = 2 * Math.sqrt(Math.pow(this.complexValues[i].real, 2) + Math.pow(this.complexValues[i].imag, 2)) / this.bufferSize;
  }

  return this.spectrum;
};


/** 
 * FFT is a class for calculating the Discrete Fourier Transform of a signal 
 * with the Fast Fourier Transform algorithm.
 *
 * @param   {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param   {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
FFT = function(bufferSize, sampleRate) {
  this.bufferSize = bufferSize;
  this.sampleRate = sampleRate;

  this.spectrum         = new Float32Array(bufferSize/2);
  this.real             = new Float32Array(bufferSize);
  this.imag             = new Float32Array(bufferSize);
    
  this.reverseTable     = new Uint32Array(bufferSize);
  this.reverseTable[0]  = 0;

  var limit = 1;
  var bit = bufferSize >> 1;

  while ( limit < bufferSize ) {
    for ( var i = 0; i < limit; i++ ) {
      this.reverseTable[i + limit] = this.reverseTable[i] + bit;
    }

    limit = limit << 1;
    bit = bit >> 1;
  }

  this.sinTable = new Float32Array(bufferSize);
  this.cosTable = new Float32Array(bufferSize);

  var sin = Math.sin;
  var cos = Math.cos;
  var PI  = Math.PI;

  for ( var i = 0; i < bufferSize; i++ ) {
    this.sinTable[i] = sin(-PI/i);
    this.cosTable[i] = cos(-PI/i);
  }
};

/**
 * Performs a forward tranform on the sample buffer. 
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param   {Array} buffer The sample buffer. Buffer Length must be power of 2
 *
 * @returns The frequency spectrum array
 */
FFT.prototype.forward = function(buffer) {
  if ( this.bufferSize % 2 != 0 )         { throw "Invalid buffer size, must be a power of 2."; }
  if ( this.bufferSize != buffer.length ) { throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + this.bufferSize + " Buffer Size: " + buffer.length; }

  for ( var i = 0; i < buffer.length; i++ ) {
    this.real[i] = buffer[this.reverseTable[i]];
    this.imag[i] = 0.0;
  }

  var halfSize = 1;

  while ( halfSize < buffer.length ) {
    var phaseShiftStepReal = this.cosTable[halfSize];
    var phaseShiftStepImag = this.sinTable[halfSize];
    var currentPhaseShiftReal = 1.0;
    var currentPhaseShiftImag = 0.0;

    for ( var fftStep = 0; fftStep < halfSize; fftStep++ ) {
      var i = fftStep;

      while ( i < buffer.length ) {
        var off = i + halfSize;
        var tr = (currentPhaseShiftReal * this.real[off]) - (currentPhaseShiftImag * this.imag[off]);
        var ti = (currentPhaseShiftReal * this.imag[off]) + (currentPhaseShiftImag * this.real[off]);

        this.real[off] = this.real[i] - tr;
        this.imag[off] = this.imag[i] - ti;
        this.real[i] += tr;
        this.imag[i] += ti;

        i += halfSize << 1;
      }

      var tmpReal = currentPhaseShiftReal;
      currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
      currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
    }

    halfSize = halfSize << 1;
  }

  var sqrt = Math.sqrt;

  for ( var i = 0; i < this.bufferSize/2; i++ ) {
    this.spectrum[i] = 2 * sqrt(this.real[i] * this.real[i] + this.imag[i] * this.imag[i]) / this.bufferSize;
  }
  
  return this.spectrum;
};


/**
 * Oscillator class for generating and modifying signals
 *
 * @param {Number} type       A waveform constant (eg. DSP.SINE)
 * @param {Number} frequency  Initial frequency of the signal
 * @param {Number} amplitude  Initial amplitude of the signal
 * @param {Number} bufferSize Size of the sample buffer to generate
 * @param {Number} sampleRate The sample rate of the signal
 *
 * @contructor
 */
Oscillator = function Oscillator(type, frequency, amplitude, bufferSize, sampleRate) {
  this.frequency  = frequency;
  this.amplitude  = amplitude;
  this.bufferSize = bufferSize;
  this.sampleRate = sampleRate;
  //this.pulseWidth = pulseWidth;
  this.frameCount = 0;
  
  this.waveTableLength = 2048;

  this.cyclesPerSample = frequency / sampleRate;

  this.signal = new Float32Array(bufferSize);
  this.envelope = null;


  switch(parseInt(type)) {
    case DSP.TRIANGLE:
      this.func = Oscillator.Triangle;
      break;

    case DSP.SAW:
      this.func = Oscillator.Saw;
      break;

    case DSP.SQUARE:
      this.func = Oscillator.Square;
      break;

    case DSP.SINE:
    default:
      this.func = Oscillator.Sine;
      break;
  }

  this.generateWaveTable = function() {
    Oscillator.waveTable[this.func] = new Float32Array(2048);
    var waveTableTime = this.waveTableLength / this.sampleRate;
    var waveTableHz = 1 / waveTableTime;

    for (var i = 0; i < this.waveTableLength; i++) {
      Oscillator.waveTable[this.func][i] = this.func(i * waveTableHz/this.sampleRate);
    }
  };

  if ( typeof Oscillator.waveTable === 'undefined' ) {
    Oscillator.waveTable = {};
  }

  if ( typeof Oscillator.waveTable[this.func] === 'undefined' ) { 
    this.generateWaveTable();
  }
  
  this.waveTable = Oscillator.waveTable[this.func];
}; 

/**
 * Set the amplitude of the signal
 *
 * @param {Number} amplitude The amplitude of the signal (between 0 and 1)
 */
Oscillator.prototype.setAmp = function(amplitude) {
  if (amplitude >= 0 && amplitude <= 1) {
    this.amplitude = amplitude;
  } else {
    throw "Amplitude out of range (0..1).";
  }
};
   
/**
 * Set the frequency of the signal
 * 
 * @param {Number} frequency The frequency of the signal
 */   
Oscillator.prototype.setFreq = function(frequency) {
  this.frequency = frequency;
  this.cyclesPerSample = frequency / this.sampleRate;
};
      
// Add an oscillator
Oscillator.prototype.add = function(oscillator) {
  for ( var i = 0; i < this.bufferSize; i++ ) {
    //this.signal[i] += oscillator.valueAt(i);
    this.signal[i] += oscillator.signal[i];
  }
  
  return this.signal;
};
      
// Add a signal to the current generated osc signal
Oscillator.prototype.addSignal = function(signal) {
  for ( var i = 0; i < signal.length; i++ ) {
    if ( i >= this.bufferSize ) {
      break;
    }
    this.signal[i] += signal[i];
    
    /*
    // Constrain amplitude
    if ( this.signal[i] > 1 ) {
      this.signal[i] = 1;
    } else if ( this.signal[i] < -1 ) {
      this.signal[i] = -1;
    }
    */
  }
  return this.signal;
};
      
// Add an envelope to the oscillator
Oscillator.prototype.addEnvelope = function(envelope) {
  this.envelope = envelope;
};
      
Oscillator.prototype.valueAt = function(offset) {
  return this.waveTable[offset % this.waveTableLength];
};
      
Oscillator.prototype.generate = function() {
  var frameOffset = this.frameCount * this.bufferSize;
  var step = this.waveTableLength * this.frequency / this.sampleRate;
  var offset;

  for ( var i = 0; i < this.bufferSize; i++ ) {
    //var step = (frameOffset + i) * this.cyclesPerSample % 1;
    //this.signal[i] = this.func(step) * this.amplitude;
    //this.signal[i] = this.valueAt(Math.round((frameOffset + i) * step)) * this.amplitude; 
    offset = Math.round((frameOffset + i) * step);
    this.signal[i] = this.waveTable[offset % this.waveTableLength] * this.amplitude;
  }

  this.frameCount++;

  return this.signal;
};

Oscillator.Sine = function(step) {
  return Math.sin(DSP.TWO_PI * step);
};

Oscillator.Square = function(step) {
  return step < 0.5 ? 1 : -1;
};

Oscillator.Saw = function(step) {
  return 2 * (step - Math.round(step));
};

Oscillator.Triangle = function(step) {
  return 1 - 4 * Math.abs(Math.round(step) - step);
};

Oscillator.Pulse = function(step) {
  // stub
};
  
ADSR = function(attackLength, decayLength, sustainLevel, sustainLength, releaseLength, sampleRate) {
  this.attackLength  = attackLength;
  this.decayLength   = decayLength;
  this.sustainLevel  = sustainLevel;
  this.sustainLength = sustainLength;
  this.releaseLength = releaseLength;
  this.sampleRate    = sampleRate;
  
  this.attackSamples  = attackLength  * sampleRate;
  this.decaySamples   = decayLength   * sampleRate;
  this.sustainSamples = sustainLength * sampleRate;
  this.releaseSamples = releaseLength * sampleRate;
  
  this.attack         =                this.attackSamples;
  this.decay          = this.attack  + this.decaySamples;
  this.sustain        = this.decay   + this.sustainSamples;
  this.release        = this.sustain + this.releaseSamples;
    
  this.samplesProcessed = 0;
};


ADSR.prototype.trigger = function() {
  this.samplesProcessed = 0;
};

ADSR.prototype.processSample = function(sample) {
  var amplitude = 0;

  if ( this.samplesProcessed <= this.attack ) {
    amplitude = 0 + (1 - 0) * ((this.samplesProcessed - 0) / (this.attack - 0));
  } else if ( this.samplesProcessed > this.attack && this.samplesProcessed <= this.decay ) {
    amplitude = 1 + (this.sustainLevel - 1) * ((this.samplesProcessed - this.attack) / (this.decay - this.attack));
  } else if ( this.samplesProcessed > this.decay && this.samplesProcessed <= this.sustain ) {
    amplitude = this.sustainLevel;
  } else if ( this.samplesProcessed > this.sustain && this.samplesProcessed <= this.release ) {
    amplitude = this.sustainLevel + (0 - this.sustainLevel) * ((this.samplesProcessed - this.sustain) / (this.release - this.sustain));
  }
  
  return sample * amplitude;
};

ADSR.prototype.value = function() {
  var amplitude = 0;

  if ( this.samplesProcessed <= this.attack ) {
    amplitude = 0 + (1 - 0) * ((this.samplesProcessed - 0) / (this.attack - 0));
  } else if ( this.samplesProcessed > this.attack && this.samplesProcessed <= this.decay ) {
    amplitude = 1 + (this.sustainLevel - 1) * ((this.samplesProcessed - this.attack) / (this.decay - this.attack));
  } else if ( this.samplesProcessed > this.decay && this.samplesProcessed <= this.sustain ) {
    amplitude = this.sustainLevel;
  } else if ( this.samplesProcessed > this.sustain && this.samplesProcessed <= this.release ) {
    amplitude = this.sustainLevel + (0 - this.sustainLevel) * ((this.samplesProcessed - this.sustain) / (this.release - this.sustain));
  }
  
  return amplitude;
};
      
ADSR.prototype.process = function(buffer) {
  for ( var i = 0; i < buffer.length; i++ ) {
    /*
    var amplitude = 0;
    
    if ( this.samplesProcessed <= this.attack ) {
      amplitude = 0 + (1 - 0) * ((this.samplesProcessed - 0) / (this.attack - 0));
    } else if ( this.samplesProcessed > this.attack && this.samplesProcessed <= this.decay ) {
      amplitude = 1 + (this.sustainLevel - 1) * ((this.samplesProcessed - this.attack) / (this.decay - this.attack));
    } else if ( this.samplesProcessed > this.decay && this.samplesProcessed <= this.sustain ) {
      amplitude = this.sustainLevel;
    } else if ( this.samplesProcessed > this.sustain && this.samplesProcessed <= this.release ) {
      amplitude = this.sustainLevel + (0 - this.sustainLevel) * ((this.samplesProcessed - this.sustain) / (this.release - this.sustain));
    }
    
    buffer[i] *= amplitude;

    this.samplesProcessed++;
    */

    buffer[i] *= this.value();

    this.samplesProcessed++;
  }
  
  return buffer;
};
      
      
ADSR.prototype.isActive = function() {
  if ( this.samplesProcessed > this.release ) {
    return false;
  } else {
    return true;
  }
};
  
IIRFilter = function(type, cutoff, resonance, sampleRate) {
  this.sampleRate = sampleRate;
  this.cutoff     = cutoff;
  this.resonance  = resonance;

  switch(type) {
    case DSP.LOWPASS:
    case DSP.LP12:
      this.func = new IIRFilter.LP12(cutoff, resonance, sampleRate);
      break;
  }
}

IIRFilter.prototype.set = function(cutoff, resonance) {
  this.func.calcCoeff(cutoff, resonance);
}

IIRFilter.prototype.process = function(buffer) {
  this.func.process(buffer);
}

// Add an envelope to the filter
IIRFilter.prototype.addEnvelope = function(envelope) {
  if ( envelope instanceof ADSR ) {
    this.func.addEnvelope(envelope);
  } else {
    throw "Not an envelope.";
  }
};

IIRFilter.LP12 = function(cutoff, resonance, sampleRate) {
  this.sampleRate = sampleRate;
  this.vibraPos   = 0; 
  this.vibraSpeed = 0;
  this.envelope = false;
  
  this.calcCoeff = function(cutoff, resonance) {
    this.w = 2.0 * Math.PI * cutoff / this.sampleRate;
    this.q = 1.0 - this.w / (2.0 * (resonance + 0.5 / (1.0 + this.w)) + this.w - 2.0);
    this.r = this.q * this.q;
    this.c = this.r + 1.0 - 2.0 * Math.cos(this.w) * this.q;
    
    this.cutoff = cutoff;
    this.resonance = resonance;
  };

  this.calcCoeff(cutoff, resonance);

  this.process = function(buffer) {
    for ( var i = 0; i < buffer.length; i++ ) {
      this.vibraSpeed += (buffer[i] - this.vibraPos) * this.c;
      this.vibraPos   += this.vibraSpeed;
      this.vibraSpeed *= this.r;
    
      /* 
      var temp = this.vibraPos;
      
      if ( temp > 1.0 ) {
        temp = 1.0;
      } else if ( temp < -1.0 ) {
        temp = -1.0;
      } else if ( temp != temp ) {
        temp = 1;
      }
      
      buffer[i] = temp;
      */ 

      if (this.envelope) {
        buffer[i] = (buffer[i] * (1 - this.envelope.value())) + (this.vibraPos * this.envelope.value());
        this.envelope.samplesProcessed++;
      } else {
        buffer[i] = this.vibraPos;
      }
    }
  }
};  

IIRFilter.LP12.prototype.addEnvelope = function(envelope) {
  this.envelope = envelope;
};

IIRFilter2 = function(type, cutoff, resonance, sampleRate) {
  this.type = type; 
  this.cutoff = cutoff;
  this.resonance = resonance;
  this.sampleRate = sampleRate;

  this.calcCoeff = function(cutoff, resonance) {
    this.freq = 2 * Math.sin(Math.PI * Math.min(0.25, cutoff/(this.sampleRate*2)));   
    this.damp = Math.min(2 * (1 - Math.pow(resonance, 0.25)), Math.min(2, 2/this.freq - this.freq * 0.5));
  };

  this.calcCoeff(cutoff, resonance);
};

IIRFilter2.prototype.process = function(buffer) {
  var input, output, lp, hp, bp, br;

  var f = Array(4);
  f[0] = 0; // lp
  f[1] = 0; // hp
  f[2] = 0; // bp
  f[3] = 0; // br

  for ( var i = 0; i < buffer.length; i++ ) {
    input = buffer[i]; 

    // first pass
    f[3] = input - this.damp * f[2];
    f[0] = f[0] + this.freq * f[2];
    f[1] = f[3] - f[0];
    f[2] = this.freq * f[1] + f[2];
    output = 0.5 * f[this.type];

    // second pass
    f[3] = input - this.damp * f[2];
    f[0] = f[0] + this.freq * f[2];
    f[1] = f[3] - f[0];
    f[2] = this.freq * f[1] + f[2];
    output += 0.5 * f[this.type];

    if (this.envelope) {
      buffer[i] = (buffer[i] * (1 - this.envelope.value())) + (output * this.envelope.value());
      this.envelope.samplesProcessed++;
    } else {
      buffer[i] = output;
    }
  }
};

IIRFilter2.prototype.addEnvelope = function(envelope) {
  if ( envelope instanceof ADSR ) {
    this.envelope = envelope;
  } else {
    throw "This is not an envelope.";
  }
};

IIRFilter2.prototype.set = function(cutoff, resonance) {
  this.calcCoeff(cutoff, resonance); 
};

WindowFunction = function(type, alpha) {
  this.alpha = alpha;
  
  switch(type) {
    case DSP.BARTLETT:
      this.func = WindowFunction.Bartlett;
      break;
      
    case DSP.BARTLETTHANN:
      this.func = WindowFunction.BartlettHann;
      break;
      
    case DSP.BLACKMAN:
      this.func = WindowFunction.Blackman;
      this.alpha = this.alpha || 0.16;
      break;
    
    case DSP.COSINE:
      this.func = WindowFunction.Cosine;
      break;
      
    case DSP.GAUSS:
      this.func = WindowFunction.Gauss;
      this.alpha = this.alpha || 0.25;
      break;
      
    case DSP.HAMMING:
      this.func = WindowFunction.Hamming;
      break;
      
    case DSP.HANN:
      this.func = WindowFunction.Hann;
      break;
    
    case DSP.LANCZOS:
      this.func = WindowFunction.Lanczoz;
      break;
      
    case DSP.RECTANGULAR:
      this.func = WindowFunction.Rectangular;
      break;
      
    case DSP.TRIANGULAR:
      this.func = WindowFunction.Triangular;
      break;
  }
};

WindowFunction.prototype.process = function(buffer) {
  var length = buffer.length;
  for ( var i = 0; i < length; i++ ) {
    buffer[i] *= this.func(length, i, this.alpha);
  }
};

WindowFunction.Bartlett = function(length, index) {
  return 2 / (length - 1) * ((length - 1) / 2 - Math.abs(index - (length - 1) / 2));
};

WindowFunction.BartlettHann = function(length, index) {
  return 0.62 - 0.48 * Math.abs(index / (length - 1) - 0.5) - 0.38 * Math.cos(DSP.TWO_PI * index / (length - 1));
};

WindowFunction.Blackman = function(length, index, alpha) {
  var a0 = (1 - alpha) / 2;
  var a1 = 0.5;
  var a2 = alpha / 2;

  return a0 - a1 * Math.cos(DSP.TWO_PI * index / (length - 1)) + a2 * Math.cos(4 * Math.PI * index / (length - 1));
};

WindowFunction.Cosine = function(length, index) {
  return Math.cos(Math.PI * index / (length - 1) - Math.PI / 2);
};

WindowFunction.Gauss = function(length, index, alpha) {
  return Math.pow(Math.E, -0.5 * Math.pow((index - (length - 1) / 2) / (alpha * (length - 1) / 2), 2));
};

WindowFunction.Hamming = function(length, index) {
  return 0.54 - 0.46 * Math.cos(DSP.TWO_PI * index / (length - 1));
};

WindowFunction.Hann = function(length, index) {
  return 0.5 * (1 - Math.cos(DSP.TWO_PI * index / (length - 1)));
};

WindowFunction.Lanczos = function(length, index) {
  var x = 2 * index / (length - 1) - 1;
  return Math.sin(Math.PI * x) / (Math.PI * x);
};

WindowFunction.Rectangular = function(length, index) {
  return 1;
};

WindowFunction.Triangular = function(length, index) {
  return 2 / length * (length / 2 - Math.abs(index - (length - 1) / 2));
};
