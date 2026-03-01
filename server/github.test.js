/* global describe, it, expect */
'use strict';

const { extractToken, getOctokit } = require('./github');

describe('extractToken', () => {
  it('henter token fra Authorization: Bearer header', () => {
    const req = { headers: { authorization: 'Bearer abc123' } };
    expect(extractToken(req)).toBe('abc123');
  });

  it('er case-insensitiv for Bearer', () => {
    expect(extractToken({ headers: { authorization: 'bearer xyz' } })).toBe('xyz');
    expect(extractToken({ headers: { authorization: 'BEARER xyz' } })).toBe('xyz');
    expect(extractToken({ headers: { authorization: 'BeArEr xyz' } })).toBe('xyz');
  });

  it('returnerer null uten auth header', () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    expect(extractToken({ headers: {} })).toBeNull();
    if (original) process.env.GITHUB_TOKEN = original;
  });

  it('returnerer null ved ugyldig header-format', () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    expect(extractToken({ headers: { authorization: 'Basic abc' } })).toBeNull();
    expect(extractToken({ headers: { authorization: '' } })).toBeNull();
    if (original) process.env.GITHUB_TOKEN = original;
  });

  it('faller tilbake til GITHUB_TOKEN env', () => {
    const original = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'env-token';
    expect(extractToken({ headers: {} })).toBe('env-token');
    if (original) process.env.GITHUB_TOKEN = original;
    else delete process.env.GITHUB_TOKEN;
  });

  it('foretrekker header over env', () => {
    const original = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'env-token';
    expect(extractToken({ headers: { authorization: 'Bearer hdr-token' } })).toBe('hdr-token');
    if (original) process.env.GITHUB_TOKEN = original;
    else delete process.env.GITHUB_TOKEN;
  });
});

describe('getOctokit', () => {
  it('returnerer en Octokit-instans', () => {
    const octo = getOctokit('test-token');
    expect(octo).toBeDefined();
    expect(octo.repos).toBeDefined();
    expect(octo.issues).toBeDefined();
  });
});
