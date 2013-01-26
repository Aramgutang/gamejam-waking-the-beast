#!/usr/bin/env python

import os
import re
import StringIO
import subprocess
import sys

# Matches text outside HTML tags, removing non-space whitespace, and
# removing spaces adjacent to tags
outside_tags = re.compile(r'\s*>[^<]+<\s*', re.M)
def strip_whitespace(match):
    stripped = match.group(0).replace('\t', '').replace('\n', '')
    return re.sub(r'\s+<', '<', re.sub(r'>\s+', '>', stripped))

# Matches .class or #id names in CSS and reduces them to their first letter
names_re = re.compile(r'([#\.][\w\-]+)(?=[^}]*{)', re.M)
def trim_css_names(match):
    return match.group(1)[:2]

# Matches class or id declarations inside HTML tags and reduces them to their
# first letter
attributes = re.compile(r'(class|id)\s*=\s*[\'"](.*?)[\'"]')
def trim_attributes(match):
    names = [n[0] for n in match.group(2).split(' ')]
    return '%s=\'%s\'' % (match.group(1,), ' '.join(names))

# Matches the insides of HTML tags and passes it on to trim_attributes above
# to trim class and id names
inside_tags = re.compile(r'<[^>]+>', re.M)
def trim_html_names(match):
    return attributes.sub(trim_attributes, match.group(0))

# Matches a <link> lag with a "href" and inlines the linked CSS, minifying
# it first. Note that this assumes that all class and id names start with
# unique letters.
link_tag = re.compile(r'<link[^>]+href\s*=\s*[\'"](.*?)[\'"][^>]*>', re.M)
def compress_and_inline_css(match):
    style_path = os.path.join(os.path.dirname(sys.argv[1]), match.group(1))
    with open(style_path) as style_file:
        style = style_file.read()
        # Trim calss and id names to their first letter
        trimmed_style = names_re.sub(trim_css_names, style)
    # Minify with YUI
    compress_command = subprocess.Popen(
        ['java', '-jar', 'yuicompressor-2.4.8pre.jar', '--type', 'css'],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    )
    compressed,_ = compress_command.communicate(trimmed_style)
    return '<style>%s</style>' % compressed

# Matches a <script> tag with an "src" and inlines the JS, minifying it first.
# Note that as above, class and id names are assumed to start with unique
# letter. Since YUI doesn't touch global variables, we minify them using the
# mapping below first.
script_replace = (
    ('boxes', 'x'),
    ("'box'", "'b'"),
    ("'heartbeat'", "'h'"),
    ('cattery', 'c'),
    ('playarea', 'p'),
    ('cats', 's'),
    ("'cat'", "'c'"),
    ('looper', 'l'),
    ('level', 'v'),
)
script_tag = re.compile(r'<script[^>]+src\s*=\s*[\'"](.*?)[\'"][^>]*>', re.M)
def compress_and_inline_js(match):
    script_path = os.path.join(os.path.dirname(sys.argv[1]), match.group(1))
    with open(script_path) as script_file:
        script = script_file.read()
        # Minify the things that YUI won't
        for key, value in script_replace:
            script = script.replace(key, value)
    # Minify with YUI
    compress_command = subprocess.Popen(
        ['java', '-jar', 'yuicompressor-2.4.8pre.jar', '--type', 'js'],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    )
    compressed,_ = compress_command.communicate(script)
    return '<script>%s' % compressed

# The main running block. Minifies the HTML file passed as argument.
with open(sys.argv[1]) as html_file:
    html = html_file.read()
    html = outside_tags.sub(strip_whitespace, html)
    html = inside_tags.sub(trim_html_names, html)
    html = link_tag.sub(compress_and_inline_css, html)
    html = script_tag.sub(compress_and_inline_js, html)
    print html
