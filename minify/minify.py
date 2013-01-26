#!/usr/bin/env python

import os
import re
import StringIO
import subprocess
import sys

names_re = re.compile(r'([#\.][\w\-]+)(?=[^}]*{)', re.M)
outside_tags = re.compile(r'\s*>[^<]+<\s*', re.M)
inside_tags = re.compile(r'<[^>]+>', re.M)
attributes = re.compile(r'(class|id)\s*=\s*[\'"](.*?)[\'"]')
link_tag = re.compile(r'<link[^>]+href\s*=\s*[\'"](.*?)[\'"][^>]*>', re.M)

def strip_whitespace(match):
    return match.group(0).replace(' ', '').replace('\t', '').replace('\n', '')

def trim_css_names(match):
    return match.group(1)[:2]

def trim_attributes(match):
    names = [n[0] for n in match.group(2).split(' ')]
    return '%s=\'%s\'' % (match.group(1,), ' '.join(names))

def trim_html_names(match):
    return attributes.sub(trim_attributes, match.group(0))

def compress_and_inline_css(match):
    style_path = os.path.join(os.path.dirname(sys.argv[1]), match.group(1))
    with open(style_path) as style_file:
        style = style_file.read()
        trimmed_style = names_re.sub(trim_css_names, style)
        
    compress_command = subprocess.Popen(
        ['java', '-jar', 'yuicompressor-2.4.8pre.jar', '--type', 'css'],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    )
    compressed,_ = compress_command.communicate(trimmed_style)
    return '<style>%s</style>' % compressed
    

with open(sys.argv[1]) as html_file:
    html = html_file.read()
    html = outside_tags.sub(strip_whitespace, html)
    html = inside_tags.sub(trim_html_names, html)
    html = link_tag.sub(compress_and_inline_css, html)
    print html