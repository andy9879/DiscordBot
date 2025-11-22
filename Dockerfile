FROM bitnami/minideb


#Set /app has working dir
WORKDIR /app

#update 
RUN apt update

#install basic tools
RUN apt install -y ncurses-bin bash-completion libncurses5-dev libncursesw5-dev unzip zip git curl wget vim nano man-db tree screen

#sets up .bashrc
RUN echo 'if [ -f /etc/bash_completion ]; then\n' >> "/root/.bashrc"
RUN echo ' . /etc/bash_completion\n' >> "/root/.bashrc"
RUN echo 'fi\n' >> "/root/.bashrc"
RUN echo 'parse_git_branch() {' >> "/root/.bashrc"
RUN echo -n "git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \\(.*\\)/ (\\" >> "/root/.bashrc"
RUN echo "1)/'" >> "/root/.bashrc"
RUN echo '}' >> "/root/.bashrc"
RUN echo "alias ls='ls --color=auto'" >> "/root/.bashrc"
RUN echo 'export LS_COLORS="$(vivid generate solarized-dark)"' >> "/root/.bashrc"
RUN echo "alias hope='telnet towel.blinkenlights.nl'" >> "/root/.bashrc"
RUN echo 'export PS1="\n\\[\\033[34m\\]Docker @\\[\\033[33m\\]\\$(parse_git_branch) \\[\\033[32m\\]\\w\\[\\033[00m\\]\n$ "\n' >> "/root/.bashrc"

# installs colors themes for ls
#https://github.com/sharkdp/vivid
RUN wget "https://github.com/sharkdp/vivid/releases/download/v0.8.0/vivid_0.8.0_amd64.deb"
RUN dpkg -i vivid_0.8.0_amd64.deb
RUN rm vivid_0.8.0_amd64.deb

#install  node
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt install -y nodejs
RUN npm install -g yarn


#install ffmpeg
RUN apt install -y ffmpeg


## install nodemon
RUN yarn global add nodemon